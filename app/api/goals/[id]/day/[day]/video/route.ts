import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { Prisma } from '@prisma/client'
import { authOptions } from '@/lib/auth'
import { prisma, ensureDatabaseSchema } from '@/lib/prisma'
import { searchDualYouTube } from '@/lib/scrape'
import { logger } from '@/lib/logger'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; day: string }> }
) {
  try {
    await ensureDatabaseSchema()
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id, day: dayStr } = await params
    const day = parseInt(dayStr, 10)
    if (!Number.isInteger(day) || day < 1) {
      return NextResponse.json({ error: 'Invalid day' }, { status: 400 })
    }

    const goal = await prisma.goal.findFirst({
      where: { id, userId: session.user.id },
      select: { id: true, title: true, category: true, language: true },
    })
    if (!goal) return NextResponse.json({ error: 'Goal not found' }, { status: 404 })

    let reqLang: string | undefined
    try {
      const body = await req.json()
      if (body?.language && typeof body.language === 'string') {
        reqLang = body.language
      }
    } catch {
      // no json body
    }

    const task = await prisma.task.findFirst({ where: { goalId: id, day } })
    const topic = task?.title || `${goal.title} — day ${day}`
    const description = task?.description || ''
    const effectiveLanguage = reqLang || goal.language || 'en'

    logger.info('VIDEO_REVERIFY', 'Re-verifying dual video with AI', { goalId: id, day, topic, language: effectiveLanguage })

    const video = await searchDualYouTube(topic, {
      goalTitle: goal.title,
      category: goal.category,
      description,
      language: effectiveLanguage,
    })

    const videoJson: Prisma.InputJsonValue | typeof Prisma.JsonNull = video
      ? (video as unknown as Prisma.InputJsonValue)
      : Prisma.JsonNull

    await prisma.dayContent.upsert({
      where: { goalId_day: { goalId: id, day } },
      create: { goalId: id, day, video: videoJson, docs: Prisma.JsonNull, text: Prisma.JsonNull },
      update: { video: videoJson },
    })

    return NextResponse.json({ video })
  } catch (error) {
    logger.error('VIDEO_REVERIFY', 'Failed to re-verify video', error)
    return NextResponse.json({ error: 'Failed to re-verify video' }, { status: 500 })
  }
}
