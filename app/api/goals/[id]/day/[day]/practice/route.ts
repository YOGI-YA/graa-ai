import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { Prisma } from '@prisma/client'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generatePracticeTask, type PracticeTask } from '@/lib/groq'

export const runtime = 'nodejs'
export const maxDuration = 60

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

// GET — return the day's practice task (generated + cached once). Gated on a passing quiz.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string; day: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id, day: dayStr } = await params
    const day = parseInt(dayStr, 10)
    if (!Number.isInteger(day) || day < 1) return NextResponse.json({ error: 'Invalid day' }, { status: 400 })

    const goal = await prisma.goal.findFirst({ where: { id, userId: session.user.id }, select: { id: true, title: true, category: true } })
    if (!goal) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Gate: require a passing quiz attempt for this day.
    const passed = await prisma.quizAttempt.findFirst({ where: { goalId: id, day, userId: session.user.id, passed: true }, select: { id: true } })
    if (!passed) return NextResponse.json({ error: 'Pass the quiz to unlock practice' }, { status: 403 })

    const content = await prisma.dayContent.findUnique({ where: { goalId_day: { goalId: id, day } } })
    const existing = content?.practice as unknown as PracticeTask | null
    if (existing && existing.title) {
      return NextResponse.json({ task: existing })
    }

    const dayTask = await prisma.task.findFirst({ where: { goalId: id, day } })
    const topic = dayTask?.title || `${goal.title} — day ${day}`
    const grounding = content ? buildGrounding(content.text, content.docs) : ''

    const task = await generatePracticeTask(topic, dayTask?.description || '', goal.category, grounding)
    const taskJson = task as unknown as Prisma.InputJsonValue

    await prisma.dayContent.upsert({
      where: { goalId_day: { goalId: id, day } },
      create: { goalId: id, day, practice: taskJson },
      update: { practice: taskJson },
    })

    return NextResponse.json({ task })
  } catch (error) {
    console.error('Practice GET error', error)
    return NextResponse.json({ error: 'Failed to load practice task' }, { status: 500 })
  }
}
