import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma, ensureDatabaseSchema } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export const runtime = 'nodejs'
export const maxDuration = 30

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureDatabaseSchema()
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const goal = await prisma.goal.findFirst({
      where: { id, userId: session.user.id },
      include: {
        milestones: { orderBy: { order: 'asc' } },
        tasks: { orderBy: [{ week: 'asc' }, { day: 'asc' }] },
        quizzes: true,
        quizAttempts: {
          where: { userId: session.user.id },
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!goal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 })
    }

    const tasks = goal.tasks || []
    const milestones = goal.milestones || []
    const quizAttempts = goal.quizAttempts || []

    const totalDays = tasks.length || (milestones.length * 5) || 1
    const completedTasks = tasks.filter(t => t.completed)
    const completedDays = completedTasks.length
    const overallProgressPct = Math.round((completedDays / totalDays) * 100)

    // Calculate Quiz attempts map: best and latest per day
    const dayQuizMap = new Map<number, { latestScore: number; latestTotal: number; passed: boolean; attemptsCount: number }>()
    for (const attempt of quizAttempts) {
      if (!dayQuizMap.has(attempt.day)) {
        dayQuizMap.set(attempt.day, {
          latestScore: attempt.score,
          latestTotal: attempt.total,
          passed: attempt.passed,
          attemptsCount: 1,
        })
      } else {
        const existing = dayQuizMap.get(attempt.day)!
        existing.attemptsCount += 1
      }
    }

    // Daily breakdown for extreme graphs
    let totalQuizScore = 0
    let totalQuizMax = 0
    let totalQuizzesAttempted = 0
    let firstAttemptPassCount = 0

    const dailyTimeline = tasks.map(task => {
      const q = dayQuizMap.get(task.day)
      const hasQuiz = Boolean(q)
      const quizPct = q && q.latestTotal > 0 ? Math.round((q.latestScore / q.latestTotal) * 100) : null

      if (q) {
        totalQuizScore += q.latestScore
        totalQuizMax += q.latestTotal
        totalQuizzesAttempted += 1
        if (q.passed && q.attemptsCount === 1) firstAttemptPassCount += 1
      }

      // Practice marks: 100 if task completed, 0 otherwise
      const practiceMarks = task.completed ? 100 : 0
      const compositeScore = quizPct !== null
        ? Math.round(quizPct * 0.5 + practiceMarks * 0.5)
        : (task.completed ? 100 : 0)

      return {
        day: task.day,
        week: task.week || Math.floor((task.day - 1) / 7) + 1,
        phase: task.phase || 'General',
        title: task.title,
        completed: task.completed,
        type: task.type,
        quizScore: q ? q.latestScore : null,
        quizTotal: q ? q.latestTotal : null,
        quizPct,
        quizPassed: q ? q.passed : false,
        practiceMarks,
        compositeScore,
      }
    })

    const avgQuizAccuracy = totalQuizMax > 0 ? Math.round((totalQuizScore / totalQuizMax) * 100) : (completedDays > 0 ? 85 : 0)
    const practicePassRate = totalDays > 0 ? Math.round((completedDays / totalDays) * 100) : 0
    const firstAttemptRate = totalQuizzesAttempted > 0 ? Math.round((firstAttemptPassCount / totalQuizzesAttempted) * 100) : 80

    // Calculate Module / Milestone Breakdown
    const modulePerformance = milestones.map((m, idx) => {
      // Find matching tasks by phase name or proportional day range
      const tasksInMilestone = tasks.filter(t => (t.phase && t.phase.toLowerCase().includes(m.title.toLowerCase())) ||
        (m.title.toLowerCase().includes(t.phase?.toLowerCase() || ''))
      )

      // Fallback: chunk tasks across milestones evenly if phases aren't strictly tagged
      const effectiveTasks = tasksInMilestone.length > 0
        ? tasksInMilestone
        : tasks.slice(Math.floor((idx / milestones.length) * tasks.length), Math.floor(((idx + 1) / milestones.length) * tasks.length))

      const modTotal = effectiveTasks.length || 1
      const modCompleted = effectiveTasks.filter(t => t.completed).length
      const modPct = Math.round((modCompleted / modTotal) * 100)

      const modQuizzes = effectiveTasks.map(t => dayQuizMap.get(t.day)).filter(Boolean)
      const modQuizAvg = modQuizzes.length > 0
        ? Math.round((modQuizzes.reduce((acc, q) => acc + ((q!.latestScore / q!.latestTotal) * 100), 0) / modQuizzes.length))
        : (modCompleted > 0 ? 90 : 0)

      const modMarks = Math.round((modPct * 0.5) + (modQuizAvg * 0.5))

      let masteryLevel: 'Mastered' | 'Proficient' | 'Developing' | 'Pending' = 'Pending'
      if (modPct === 100 && modQuizAvg >= 80) masteryLevel = 'Mastered'
      else if (modPct >= 60 || modQuizAvg >= 70) masteryLevel = 'Proficient'
      else if (modPct > 0 || modQuizAvg > 0) masteryLevel = 'Developing'

      return {
        id: m.id,
        order: m.order,
        title: m.title,
        description: m.description,
        status: m.status,
        totalTasks: modTotal,
        completedTasks: modCompleted,
        progressPct: modPct,
        quizAverage: modQuizAvg,
        moduleMarks: modMarks,
        masteryLevel,
      }
    })

    // 5-Dimension Radar Mastery Metrics (0-100)
    const radarMetrics = [
      { subject: 'Conceptual Retention', score: Math.max(10, avgQuizAccuracy), fullMark: 100 },
      { subject: 'Hands-on Execution', score: Math.max(10, practicePassRate), fullMark: 100 },
      { subject: 'Curriculum Pacing', score: Math.max(10, overallProgressPct), fullMark: 100 },
      { subject: 'First-Attempt Precision', score: Math.max(10, firstAttemptRate), fullMark: 100 },
      { subject: 'Module Mastery', score: Math.max(10, Math.round(modulePerformance.reduce((a, b) => a + b.moduleMarks, 0) / (modulePerformance.length || 1))), fullMark: 100 },
    ]

    // Overall composite readiness score (0-100)
    const readinessScore = Math.round(
      (radarMetrics.reduce((acc, r) => acc + r.score, 0) / radarMetrics.length)
    )

    // Letter grade
    let grade = 'B'
    if (readinessScore >= 92) grade = 'A+'
    else if (readinessScore >= 85) grade = 'A'
    else if (readinessScore >= 78) grade = 'B+'
    else if (readinessScore >= 70) grade = 'B'
    else if (readinessScore >= 60) grade = 'C+'
    else if (readinessScore >= 50) grade = 'C'
    else grade = 'In Progress'

    logger.info('EVALUATION', 'Generated evaluation metrics', {
      goalId: id,
      completedDays,
      totalDays,
      readinessScore,
      grade,
    })

    return NextResponse.json({
      goal: {
        id: goal.id,
        title: goal.title,
        category: goal.category,
        description: goal.description,
        skillLevel: goal.skillLevel,
        durationDays: goal.durationDays,
        language: goal.language,
      },
      summary: {
        totalDays,
        completedDays,
        remainingDays: totalDays - completedDays,
        overallProgressPct,
        readinessScore,
        grade,
        avgQuizAccuracy,
        quizzesAttempted: totalQuizzesAttempted,
        firstAttemptPassRate: firstAttemptRate,
        practicePassRate,
      },
      radarMetrics,
      modulePerformance,
      dailyTimeline,
    })
  } catch (error) {
    logger.error('EVALUATION', 'Failed to generate evaluation report', error)
    return NextResponse.json({ error: 'Failed to generate evaluation report' }, { status: 500 })
  }
}
