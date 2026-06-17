import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { Prisma } from '@prisma/client'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { gatherSources } from '@/lib/scrape'
import { generateDayLesson } from '@/lib/groq'
import { indexDayContent } from '@/lib/rag'

export const runtime = 'nodejs'
export const maxDuration = 60

async function getOwnedTask(goalId: string, day: number, userId: string) {
  const goal = await prisma.goal.findFirst({
    where: { id: goalId, userId },
    select: { id: true, title: true, category: true },
  })
  if (!goal) return null
  const task = await prisma.task.findFirst({ where: { goalId, day } })
  return { goal, task }
}

// GET — return cached day content, or scrape + synthesize it once and cache.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string; day: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id, day: dayStr } = await params
    const day = parseInt(dayStr, 10)
    if (!Number.isInteger(day) || day < 1) return NextResponse.json({ error: 'Invalid day' }, { status: 400 })

    const owned = await getOwnedTask(id, day, session.user.id)
    if (!owned) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const { goal, task } = owned

    const refresh = req.nextUrl.searchParams.get('refresh') === '1'

    if (!refresh) {
      const cached = await prisma.dayContent.findUnique({ where: { goalId_day: { goalId: id, day } } })
      if (cached) {
        return NextResponse.json({ task, content: { video: cached.video, docs: cached.docs, text: cached.text }, cached: true })
      }
    }

    const topic = task?.title || `${goal.title} — day ${day}`
    const description = task?.description || ''

    // Search the SPECIFIC day topic; pass the category only as a light disambiguator.
    const sources = await gatherSources(topic, goal.category)
    const lesson = await generateDayLesson(topic, description, sources.snippets)

    const content = {
      video: sources.video ?? undefined,
      docs: sources.docs.map(d => ({ title: d.title, url: d.url, source: d.source, snippet: d.snippet })),
      text: lesson,
    }

    const videoJson: Prisma.InputJsonValue | typeof Prisma.JsonNull = content.video
      ? (content.video as unknown as Prisma.InputJsonValue)
      : Prisma.JsonNull
    const docsJson = content.docs as unknown as Prisma.InputJsonValue
    const textJson = content.text as unknown as Prisma.InputJsonValue

    await prisma.dayContent.upsert({
      where: { goalId_day: { goalId: id, day } },
      create: { goalId: id, day, video: videoJson, docs: docsJson, text: textJson },
      // On refresh, also clear the derived practice task so it regenerates fresh.
      update: { video: videoJson, docs: docsJson, text: textJson, ...(refresh ? { practice: Prisma.JsonNull } : {}) },
    })

    // On refresh, drop the cached quiz so it regenerates from the corrected content.
    if (refresh) {
      await prisma.quiz.deleteMany({ where: { goalId: id, day } }).catch(() => {})
    }

    // Index this day's content for RAG (best-effort — never block the response).
    try {
      await indexDayContent(id, day, { lesson: content.text, docs: content.docs })
    } catch (err) {
      console.error('Failed to index day content for RAG', err)
    }

    return NextResponse.json({ task, content, cached: false })
  } catch (error) {
    console.error('Day content error', error)
    return NextResponse.json({ error: 'Failed to load day content' }, { status: 500 })
  }
}

// PATCH — toggle/set the day's completion.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; day: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id, day: dayStr } = await params
    const day = parseInt(dayStr, 10)
    const { completed } = await req.json()

    const owned = await getOwnedTask(id, day, session.user.id)
    if (!owned?.task) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const task = await prisma.task.update({
      where: { id: owned.task.id },
      data: { completed: typeof completed === 'boolean' ? completed : !owned.task.completed },
    })

    return NextResponse.json({ task })
  } catch (error) {
    console.error('Day complete error', error)
    return NextResponse.json({ error: 'Failed to update day' }, { status: 500 })
  }
}
