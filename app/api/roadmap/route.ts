import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateRoadmapDraft } from '@/lib/groq'

async function getLearningStyle(userId: string): Promise<string | undefined> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { learningStyle: true },
    })
    return user?.learningStyle || undefined
  } catch (error) {
    console.error('Failed to load learning style for roadmap draft', error)
    return undefined
  }
}

export async function POST(req: NextRequest) {
  try {
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

    return NextResponse.json({ roadmap: draft })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate roadmap'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
