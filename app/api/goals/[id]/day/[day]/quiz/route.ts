import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { Prisma } from '@prisma/client'
import { authOptions } from '@/lib/auth'
import { prisma, ensureDatabaseSchema } from '@/lib/prisma'
import { generateQuiz, type QuizQuestion } from '@/lib/groq'
import { logger } from '@/lib/logger'

export const runtime = 'nodejs'
export const maxDuration = 60

const PASS_RATIO = 0.7

async function ownedGoal(goalId: string, userId: string) {
  return prisma.goal.findFirst({ where: { id: goalId, userId }, select: { id: true, title: true, category: true, language: true } })
}

interface LessonShape {
  summary?: string
  sections?: { heading: string; body: string }[]
  keyPoints?: string[]
}
interface DocShape { title: string; source: string; snippet?: string }

function buildGrounding(text: unknown, docs: unknown): string {
  const lesson = (text || {}) as LessonShape
  const parts: string[] = []
  if (lesson.summary) parts.push(lesson.summary)
  for (const s of lesson.sections ?? []) parts.push(`${s.heading}: ${s.body}`)
  if (lesson.keyPoints?.length) parts.push(`Key points: ${lesson.keyPoints.join('; ')}`)
  for (const d of (Array.isArray(docs) ? docs : []) as DocShape[]) {
    if (d.snippet) parts.push(`${d.title}: ${d.snippet}`)
  }
  return parts.join('\n').slice(0, 6000)
}

// GET — return the day's quiz (without answers), generating + caching it once.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string; day: string }> }) {
  try {
    await ensureDatabaseSchema()
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id, day: dayStr } = await params
    const day = parseInt(dayStr, 10)
    if (!Number.isInteger(day) || day < 1) return NextResponse.json({ error: 'Invalid day' }, { status: 400 })

    const goal = await ownedGoal(id, session.user.id)
    if (!goal) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    let quiz = await prisma.quiz.findUnique({ where: { goalId_day: { goalId: id, day } } })

    if (!quiz) {
      const [task, content] = await Promise.all([
        prisma.task.findFirst({ where: { goalId: id, day } }),
        prisma.dayContent.findUnique({ where: { goalId_day: { goalId: id, day } } }),
      ])
      const topic = task?.title || `${goal.title} — day ${day}`
      const grounding = content ? buildGrounding(content.text, content.docs) : ''
      const questions = await generateQuiz(topic, task?.description || '', grounding, 5, goal.language)
      if (questions.length === 0) return NextResponse.json({ error: 'Could not generate a quiz' }, { status: 502 })

      quiz = await prisma.quiz.create({
        data: { goalId: id, day, questions: questions as unknown as Prisma.InputJsonValue },
      })
    }

    const questions = quiz.questions as unknown as QuizQuestion[]
    const lastAttempt = await prisma.quizAttempt.findFirst({
      where: { goalId: id, day, userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      select: { score: true, total: true, passed: true },
    })

    // Strip answers/explanations before sending to the client.
    return NextResponse.json({
      questions: questions.map(q => ({ question: q.question, options: q.options })),
      lastAttempt,
    })
  } catch (error) {
    logger.error('QUIZ', 'Quiz GET error', error)
    return NextResponse.json({ error: 'Failed to load quiz' }, { status: 500 })
  }
}

// POST — grade submitted answers, record an attempt, return feedback.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string; day: string }> }) {
  try {
    await ensureDatabaseSchema()
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id, day: dayStr } = await params
    const day = parseInt(dayStr, 10)
    const goal = await ownedGoal(id, session.user.id)
    if (!goal) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const { answers } = await req.json()
    if (!Array.isArray(answers)) return NextResponse.json({ error: 'Answers are required' }, { status: 400 })

    const quiz = await prisma.quiz.findUnique({ where: { goalId_day: { goalId: id, day } } })
    if (!quiz) return NextResponse.json({ error: 'Quiz not found' }, { status: 404 })

    const questions = quiz.questions as unknown as QuizQuestion[]
    const results = questions.map((q, i) => {
      const chosen = typeof answers[i] === 'number' ? answers[i] : -1
      return { chosen, correct: chosen === q.answerIndex, answerIndex: q.answerIndex, explanation: q.explanation }
    })
    const score = results.filter(r => r.correct).length
    const total = questions.length
    const passed = total > 0 && score / total >= PASS_RATIO

    await prisma.quizAttempt.create({
      data: { goalId: id, day, userId: session.user.id, score, total, passed },
    })

    logger.info('QUIZ', 'Quiz submitted and graded', { goalId: id, day, score, total, passed })
    return NextResponse.json({ score, total, passed, passRatio: PASS_RATIO, results })
  } catch (error) {
    logger.error('QUIZ', 'Quiz POST error', error)
    return NextResponse.json({ error: 'Failed to grade quiz' }, { status: 500 })
  }
}
