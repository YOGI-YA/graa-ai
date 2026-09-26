import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma, ensureDatabaseSchema } from '@/lib/prisma'
import { parseCurriculumBuffer } from '@/lib/curriculumParser'
import { generateRoadmapFromCurriculum } from '@/lib/groq'
import { logger } from '@/lib/logger'

export const runtime = 'nodejs'
export const maxDuration = 60

const goalSelect = {
  id: true,
  title: true,
  description: true,
  category: true,
  status: true,
  targetDate: true,
  durationDays: true,
  skillLevel: true,
  language: true,
  planJson: true,
  milestones: {
    select: { id: true, title: true, description: true, status: true, dueDate: true, order: true },
    orderBy: { order: 'asc' as const },
  },
  resources: {
    select: { id: true, title: true, url: true, type: true },
  },
  tasks: {
    select: { id: true, day: true, week: true, phase: true, title: true, description: true, type: true, platform: true, url: true, completed: true },
    orderBy: [{ day: 'asc' as const }],
  },
}

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

    // Limit file size to 50MB
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size exceeds 50MB limit.' }, { status: 400 })
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

    // Sanitize milestones
    const cleanMilestones = (roadmap.milestones || [])
      .filter(m => m && typeof m.title === 'string' && m.title.trim())
      .map((m, index) => ({
        title: m.title.trim().slice(0, 300),
        description: (typeof m.description === 'string' ? m.description.trim() : '').slice(0, 2000),
        order: typeof m.order === 'number' ? m.order : index + 1,
      }))

    // Sanitize resources
    const cleanResources = (roadmap.resources || [])
      .filter(r => r && typeof r.title === 'string' && r.title.trim())
      .map(r => ({
        title: r.title.trim().slice(0, 300),
        url: typeof r.url === 'string' && r.url.startsWith('http') ? r.url.slice(0, 500) : null,
        type: (typeof r.type === 'string' ? r.type : 'article').slice(0, 50),
      }))

    // Sanitize daily tasks
    const rawDays = Array.isArray(roadmap.days) ? roadmap.days : []
    const cleanDays = rawDays
      .filter(d => d && typeof d.title === 'string' && d.title.trim())
      .map((d, index) => ({
        day: typeof d.day === 'number' && d.day > 0 ? d.day : index + 1,
        week: typeof d.week === 'number' ? d.week : Math.floor(index / 7) + 1,
        phase: (typeof d.phase === 'string' ? d.phase : null)?.slice(0, 200) || null,
        title: d.title.trim().slice(0, 300),
        description: (typeof d.description === 'string' ? d.description.trim() : '').slice(0, 2000),
        type: (typeof d.type === 'string' ? d.type : 'lesson').slice(0, 50),
      }))
      .filter((d, i, arr) => arr.findIndex(x => x.day === d.day) === i)

    const effectiveDuration = cleanDays.length || roadmap.durationDays || 30

    // Build serializable planJson metadata
    const planJson = {
      title: (roadmap.title || 'Curriculum Roadmap').slice(0, 300),
      description: (roadmap.description || 'Custom Curriculum Roadmap').slice(0, 2000),
      category: (roadmap.category || 'General').slice(0, 100),
      durationDays: effectiveDuration,
      skillLevel: roadmap.skillLevel || 'beginner',
      language: language || 'en',
      milestones: cleanMilestones,
      resources: cleanResources,
      days: cleanDays,
      advice: (roadmap.advice || '').slice(0, 2000),
      curriculumFileName: extracted.fileName.slice(0, 255),
    }

    // Atomically create the Goal in PostgreSQL
    const goal = await prisma.goal.create({
      data: {
        title: (roadmap.title || 'Curriculum Roadmap').slice(0, 300),
        description: (roadmap.description || 'Custom Curriculum Roadmap').slice(0, 3000),
        category: (roadmap.category || 'General').slice(0, 100),
        durationDays: effectiveDuration,
        skillLevel: roadmap.skillLevel || 'beginner',
        language: language || 'en',
        planJson: JSON.parse(JSON.stringify(planJson)),
        userId: session.user.id,
        milestones: {
          create: cleanMilestones,
        },
        resources: {
          create: cleanResources,
        },
        tasks: {
          create: cleanDays,
        },
      },
      select: goalSelect,
    })

    logger.info('CURRICULUM_UPLOAD', 'Goal atomically created from curriculum', {
      goalId: goal.id,
      title: goal.title,
      tasksCount: cleanDays.length,
    })

    return NextResponse.json({
      goal,
      roadmap: planJson,
      text: extracted.text,
      fileName: extracted.fileName,
      charCount: extracted.charCount,
    })
  } catch (error) {
    logger.error('CURRICULUM_UPLOAD', 'Failed to parse and generate from curriculum', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process curriculum file' },
      { status: 500 }
    )
  }
}
