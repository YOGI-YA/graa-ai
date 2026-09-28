import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma, ensureDatabaseSchema } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export const runtime = 'nodejs'
export const maxDuration = 30

/**
 * GET /api/performance — Aggregated cross-goal performance analytics for the current user.
 * Computes overall mastery, quiz accuracy, learning velocity, subject-wise breakdown,
 * streak data, and radar metrics across ALL user goals.
 */
export async function GET() {
  try {
    await ensureDatabaseSchema()
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    // Fetch all goals with their tasks, milestones, quizzes, and quiz attempts
    const goals = await prisma.goal.findMany({
      where: { userId },
      include: {
        milestones: { orderBy: { order: 'asc' } },
        tasks: { orderBy: [{ day: 'asc' }] },
        quizAttempts: {
          where: { userId },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    if (goals.length === 0) {
      return NextResponse.json({
        totalGoals: 0,
        activeGoals: 0,
        completedGoals: 0,
        totalDays: 0,
        completedDays: 0,
        overallProgressPct: 0,
        overallMasteryScore: 0,
        overallGrade: 'N/A',
        avgQuizAccuracy: 0,
        totalQuizzesTaken: 0,
        streakDays: 0,
        longestStreak: 0,
        learningVelocity: 0,
        subjectBreakdown: [],
        radarMetrics: [],
        goalSummaries: [],
        weeklyActivity: [],
      })
    }

    // Aggregate metrics
    let totalDays = 0
    let completedDays = 0
    let totalQuizScore = 0
    let totalQuizMax = 0
    let totalQuizzesTaken = 0
    let firstAttemptPassCount = 0
    const activeGoals = goals.filter(g => g.status === 'ACTIVE').length
    const completedGoals = goals.filter(g => g.status === 'COMPLETED').length

    // Subject-wise breakdown map
    const subjectMap = new Map<string, {
      category: string
      totalDays: number
      completedDays: number
      quizScore: number
      quizMax: number
      goalCount: number
    }>()

    // Goal-level summaries
    const goalSummaries: {
      id: string
      title: string
      category: string
      totalDays: number
      completedDays: number
      progressPct: number
      quizAccuracy: number
      masteryScore: number
      grade: string
      status: string
    }[] = []

    // Completion dates for streak calculation
    const completionDates = new Set<string>()

    for (const goal of goals) {
      const tasks = goal.tasks || []
      const gTotalDays = tasks.length || (goal.milestones?.length ?? 0) * 5 || 1
      const gCompletedDays = tasks.filter(t => t.completed).length

      totalDays += gTotalDays
      completedDays += gCompletedDays

      // Quiz metrics for this goal
      const dayQuizMap = new Map<number, { score: number; total: number; passed: boolean; count: number }>()
      for (const attempt of goal.quizAttempts || []) {
        if (!dayQuizMap.has(attempt.day)) {
          dayQuizMap.set(attempt.day, {
            score: attempt.score,
            total: attempt.total,
            passed: attempt.passed,
            count: 1,
          })
        } else {
          dayQuizMap.get(attempt.day)!.count += 1
        }
      }

      let gQuizScore = 0
      let gQuizMax = 0
      let gQuizCount = 0

      for (const [, q] of dayQuizMap) {
        gQuizScore += q.score
        gQuizMax += q.total
        gQuizCount += 1
        totalQuizzesTaken += 1
        if (q.passed && q.count === 1) firstAttemptPassCount += 1
      }

      totalQuizScore += gQuizScore
      totalQuizMax += gQuizMax

      const gQuizAccuracy = gQuizMax > 0 ? Math.round((gQuizScore / gQuizMax) * 100) : (gCompletedDays > 0 ? 85 : 0)
      const gProgressPct = Math.round((gCompletedDays / gTotalDays) * 100)
      const gMasteryScore = Math.round((gProgressPct * 0.5) + (gQuizAccuracy * 0.5))
      const gGrade = gMasteryScore >= 92 ? 'A+' : gMasteryScore >= 85 ? 'A' : gMasteryScore >= 78 ? 'B+' :
        gMasteryScore >= 70 ? 'B' : gMasteryScore >= 60 ? 'C+' : gMasteryScore >= 50 ? 'C' : 'In Progress'

      goalSummaries.push({
        id: goal.id,
        title: goal.title,
        category: goal.category,
        totalDays: gTotalDays,
        completedDays: gCompletedDays,
        progressPct: gProgressPct,
        quizAccuracy: gQuizAccuracy,
        masteryScore: gMasteryScore,
        grade: gGrade,
        status: goal.status,
      })

      // Subject breakdown
      const cat = goal.category || 'Other'
      if (!subjectMap.has(cat)) {
        subjectMap.set(cat, { category: cat, totalDays: 0, completedDays: 0, quizScore: 0, quizMax: 0, goalCount: 0 })
      }
      const sub = subjectMap.get(cat)!
      sub.totalDays += gTotalDays
      sub.completedDays += gCompletedDays
      sub.quizScore += gQuizScore
      sub.quizMax += gQuizMax
      sub.goalCount += 1

      // Track completion dates for streaks
      for (const task of tasks) {
        if (task.completed && task.createdAt) {
          const d = new Date(task.createdAt)
          completionDates.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`)
        }
      }
    }

    // Calculate streaks
    const sortedDates = [...completionDates].sort()
    let currentStreak = 0
    let longestStreak = 0
    let tempStreak = 0
    const today = new Date()
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

    // Calculate longest streak
    for (let i = 0; i < sortedDates.length; i++) {
      if (i === 0) {
        tempStreak = 1
      } else {
        const prev = new Date(sortedDates[i - 1])
        const curr = new Date(sortedDates[i])
        const diffMs = curr.getTime() - prev.getTime()
        const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))
        tempStreak = diffDays === 1 ? tempStreak + 1 : 1
      }
      longestStreak = Math.max(longestStreak, tempStreak)
    }

    // Calculate current streak (consecutive days ending today or yesterday)
    for (let i = sortedDates.length - 1; i >= 0; i--) {
      const date = new Date(sortedDates[i])
      const expectedDate = new Date(today)
      expectedDate.setDate(expectedDate.getDate() - (sortedDates.length - 1 - i))
      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
      const expectedStr = `${expectedDate.getFullYear()}-${String(expectedDate.getMonth() + 1).padStart(2, '0')}-${String(expectedDate.getDate()).padStart(2, '0')}`

      if (i === sortedDates.length - 1) {
        const diff = Math.round((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
        if (diff > 1) break
        currentStreak = 1
      } else {
        const prev = new Date(sortedDates[i + 1])
        const diff = Math.round((prev.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
        if (diff !== 1) break
        currentStreak += 1
      }
    }

    // Overall metrics
    const overallProgressPct = totalDays > 0 ? Math.round((completedDays / totalDays) * 100) : 0
    const avgQuizAccuracy = totalQuizMax > 0 ? Math.round((totalQuizScore / totalQuizMax) * 100) : (completedDays > 0 ? 85 : 0)
    const firstAttemptRate = totalQuizzesTaken > 0 ? Math.round((firstAttemptPassCount / totalQuizzesTaken) * 100) : 80
    const learningVelocity = goals.length > 0
      ? Math.round(completedDays / Math.max(1, goals.length))
      : 0

    // Subject breakdown array
    const subjectBreakdown = [...subjectMap.values()].map(s => ({
      category: s.category,
      goalCount: s.goalCount,
      totalDays: s.totalDays,
      completedDays: s.completedDays,
      progressPct: s.totalDays > 0 ? Math.round((s.completedDays / s.totalDays) * 100) : 0,
      quizAccuracy: s.quizMax > 0 ? Math.round((s.quizScore / s.quizMax) * 100) : (s.completedDays > 0 ? 85 : 0),
    }))

    // 5-Dimension Radar Mastery (across all goals)
    const avgModuleMastery = goalSummaries.length > 0
      ? Math.round(goalSummaries.reduce((a, g) => a + g.masteryScore, 0) / goalSummaries.length)
      : 10
    const radarMetrics = [
      { subject: 'Knowledge Retention', score: Math.max(10, avgQuizAccuracy), fullMark: 100 },
      { subject: 'Practical Execution', score: Math.max(10, overallProgressPct), fullMark: 100 },
      { subject: 'Learning Consistency', score: Math.max(10, Math.min(100, currentStreak * 15)), fullMark: 100 },
      { subject: 'First-Attempt Precision', score: Math.max(10, firstAttemptRate), fullMark: 100 },
      { subject: 'Cross-Subject Mastery', score: Math.max(10, avgModuleMastery), fullMark: 100 },
    ]

    const overallMasteryScore = Math.round(radarMetrics.reduce((a, r) => a + r.score, 0) / radarMetrics.length)
    const overallGrade = overallMasteryScore >= 92 ? 'A+' : overallMasteryScore >= 85 ? 'A' :
      overallMasteryScore >= 78 ? 'B+' : overallMasteryScore >= 70 ? 'B' :
      overallMasteryScore >= 60 ? 'C+' : overallMasteryScore >= 50 ? 'C' : 'Getting Started'

    // Weekly activity (last 12 weeks)
    const weeklyActivity: { week: string; completedDays: number }[] = []
    for (let w = 11; w >= 0; w--) {
      const weekStart = new Date(today)
      weekStart.setDate(weekStart.getDate() - (w * 7 + weekStart.getDay()))
      weekStart.setHours(0, 0, 0, 0)
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekEnd.getDate() + 6)
      weekEnd.setHours(23, 59, 59, 999)

      let count = 0
      for (const dateStr of sortedDates) {
        const d = new Date(dateStr)
        if (d >= weekStart && d <= weekEnd) count++
      }

      const label = `${weekStart.getMonth() + 1}/${weekStart.getDate()}`
      weeklyActivity.push({ week: label, completedDays: count })
    }

    logger.info('PERFORMANCE', 'Generated overall performance analytics', {
      userId,
      totalGoals: goals.length,
      overallMasteryScore,
      overallGrade,
    })

    return NextResponse.json({
      totalGoals: goals.length,
      activeGoals,
      completedGoals,
      totalDays,
      completedDays,
      overallProgressPct,
      overallMasteryScore,
      overallGrade,
      avgQuizAccuracy,
      totalQuizzesTaken,
      firstAttemptRate,
      streakDays: currentStreak,
      longestStreak,
      learningVelocity,
      subjectBreakdown,
      radarMetrics,
      goalSummaries,
      weeklyActivity,
    })
  } catch (error) {
    logger.error('PERFORMANCE', 'Failed to generate performance analytics', error)
    return NextResponse.json({ error: 'Failed to generate performance analytics' }, { status: 500 })
  }
}
