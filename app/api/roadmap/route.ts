import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma, ensureDatabaseSchema } from '@/lib/prisma'
import { generateRoadmapDraft } from '@/lib/groq'
import { logger } from '@/lib/logger'

async function getLearningStyle(userId: string): Promise<string | undefined> {
  try {
    await ensureDatabaseSchema()
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { learningStyle: true },
    })
    return user?.learningStyle || undefined
  } catch (error) {
    logger.warn('ROADMAP', 'Failed to load user learning style for roadmap draft', { userId })
    return undefined
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureDatabaseSchema()
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { prompt, roadmap, durationDays, skillLevel, model, language } = await req.json()
    if (typeof prompt !== 'string' || !prompt.trim()) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }

    const learningStyle = await getLearningStyle(session.user.id)
    const targetLanguage = language || req.cookies.get('graa_lang')?.value || session.user.language || 'en'
    const draft = await generateRoadmapDraft(prompt.trim(), roadmap, learningStyle, {
      durationDays: Number.isFinite(durationDays) ? Number(durationDays) : null,
      skillLevel: typeof skillLevel === 'string' ? skillLevel : null,
      model: typeof model === 'string' ? model : undefined,
      language: targetLanguage,
    })

    logger.info('ROADMAP', 'Roadmap draft generated successfully', { userId: session.user.id, language: targetLanguage })
    return NextResponse.json({ roadmap: draft })
  } catch (error) {
    logger.error('ROADMAP', 'Failed to generate roadmap draft', error)
    return NextResponse.json({ error: 'Unable to generate roadmap right now. Please try again.' }, { status: 500 })
  }
}
