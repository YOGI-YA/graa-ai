import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma, ensureDatabaseSchema } from '@/lib/prisma'
import { parseCurriculumBuffer } from '@/lib/curriculumParser'
import { generateRoadmapFromCurriculum } from '@/lib/groq'
import { logger } from '@/lib/logger'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    await ensureDatabaseSchema()
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const language = (formData.get('language') as string) || session.user.language || 'en'
    const skillLevel = (formData.get('skillLevel') as string) || undefined
    const durationDaysRaw = formData.get('durationDays') as string | null
    const durationDays = durationDaysRaw ? parseInt(durationDaysRaw, 10) : undefined
    const generateOnlyText = formData.get('extractOnly') === 'true'

    if (!file) {
      return NextResponse.json({ error: 'No curriculum file was provided.' }, { status: 400 })
    }

    // Limit file size to 25MB
    if (file.size > 25 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size exceeds 25MB limit.' }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    logger.info('CURRICULUM_UPLOAD', 'Parsing curriculum file', {
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      userId: session.user.id,
    })

    const extracted = await parseCurriculumBuffer(buffer, file.name, file.type)

    if (generateOnlyText) {
      return NextResponse.json({
        text: extracted.text,
        fileName: extracted.fileName,
        charCount: extracted.charCount,
      })
    }

    // Fetch user learning style if set
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { learningStyle: true, language: true },
    })

    logger.info('CURRICULUM_GEN', 'Generating roadmap from curriculum text', {
      charCount: extracted.charCount,
      language: language || user?.language,
      skillLevel,
      durationDays,
    })

    const roadmap = await generateRoadmapFromCurriculum(
      extracted.text,
      user?.learningStyle || undefined,
      {
        durationDays: durationDays || null,
        skillLevel: skillLevel || null,
        language: language || user?.language || 'en',
      }
    )

    return NextResponse.json({
      text: extracted.text,
      fileName: extracted.fileName,
      charCount: extracted.charCount,
      roadmap,
    })
  } catch (error) {
    logger.error('CURRICULUM_UPLOAD', 'Failed to parse and generate from curriculum', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process curriculum file' },
      { status: 500 }
    )
  }
}
