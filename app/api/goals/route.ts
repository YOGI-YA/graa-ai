import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma, ensureDatabaseSchema } from '@/lib/prisma'
import { analyzeGoalAndGenerateMilestones, clampDuration, type MilestoneItem, type ResourceItem, type DailyTaskItem } from '@/lib/groq'
import { logger } from '@/lib/logger'

function parseDate(value: unknown): Date | null {
  if (!value || typeof value !== 'string') return null
  const d = new Date(value)
  return isNaN(d.getTime()) ? null : d
}

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

// GET /api/goals — list the current user's goals (used by the dashboard)
export async function GET() {
  try {
    await ensureDatabaseSchema()
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const goals = await prisma.goal.findMany({
      where: { userId: session.user.id },
      select: goalSelect,
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(goals)
  } catch (error) {
    logger.error('GOALS', 'Failed to retrieve goals', error)
    return NextResponse.json({ error: 'Failed to load goals' }, { status: 500 })
  }
}

// POST /api/goals — create a goal.
// Accepts either a pre-generated roadmap draft (from the roadmap builder) or a
// bare goal (from the New Goal modal), in which case we generate the plan here.
export async function POST(req: NextRequest) {
  try {
    await ensureDatabaseSchema()
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const title = typeof body.title === 'string' ? body.title.trim() : ''
    const description = typeof body.description === 'string' ? body.description.trim() : ''
    const category = typeof body.category === 'string' && body.category.trim() ? body.category.trim() : 'Other'
    const language = typeof body.language === 'string' && body.language.trim() ? body.language.trim() : (session.user.language || 'en')

    if (!title) return NextResponse.json({ error: 'Title is required' }, { status: 400 })

    const targetDate = parseDate(body.targetDate)
    const skillLevel = typeof body.skillLevel === 'string' && body.skillLevel ? body.skillLevel : null

    let milestones: MilestoneItem[] = Array.isArray(body.milestones) ? body.milestones : []
    let resources: ResourceItem[] = Array.isArray(body.resources) ? body.resources : []
    let days: DailyTaskItem[] = Array.isArray(body.days) ? body.days : []
    let advice: string = typeof body.advice === 'string' ? body.advice : ''
    let durationDays = clampDuration(body.durationDays)

    // No plan supplied (New Goal modal path) → generate one in the user's language.
    if (milestones.length === 0) {
      const generated = await analyzeGoalAndGenerateMilestones(
        title,
        description,
        category,
        body.targetDate || undefined,
        undefined,
        { durationDays, skillLevel, language },
      )
      milestones = generated.milestones
      resources = generated.resources
      days = generated.days
      advice = generated.advice
    }

    // Fall back to the generated day count if no duration was given.
    if (!durationDays && days.length > 0) durationDays = days.length

    // Sanitize milestones
    const cleanMilestones = milestones
      .filter(m => m && typeof m.title === 'string' && m.title.trim())
      .map((m, index) => ({
        title: m.title.trim().slice(0, 300),
        description: (typeof m.description === 'string' ? m.description.trim() : '').slice(0, 2000),
        order: typeof m.order === 'number' ? m.order : index + 1,
        dueDate: parseDate(m.dueDate),
      }))

    // Sanitize resources
    const cleanResources = resources
      .filter(r => r && typeof r.title === 'string' && r.title.trim())
      .map(r => ({
        title: r.title.trim().slice(0, 300),
        url: typeof r.url === 'string' && r.url.startsWith('http') ? r.url.slice(0, 500) : null,
        type: (typeof r.type === 'string' ? r.type : 'article').slice(0, 50),
      }))

    // Sanitize daily tasks ensuring unique day numbers
    const cleanDays = days
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

    // Build compact serializable planJson
    const planJson = body.milestones ? {
      title: title.slice(0, 300),
      description: description.slice(0, 2000),
      category: category.slice(0, 100),
      durationDays,
      skillLevel,
      language,
      milestones: cleanMilestones,
      resources: cleanResources,
      days: cleanDays,
      advice: (advice || '').slice(0, 2000),
      curriculumFileName: typeof body.curriculumFileName === 'string' ? body.curriculumFileName.slice(0, 255) : undefined,
    } : undefined

    const goal = await prisma.goal.create({
      data: {
        title: title.slice(0, 300),
        description: description.slice(0, 3000),
        category: category.slice(0, 100),
        targetDate,
        durationDays,
        skillLevel,
        language,
        planJson: planJson ? (JSON.parse(JSON.stringify(planJson))) : undefined,
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

    logger.info('GOALS', 'New goal created successfully', { goalId: goal.id, title: goal.title })
    return NextResponse.json({ goal, advice })
  } catch (error) {
    logger.error('GOALS', 'Failed to create goal', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to create goal roadmap. Please try again.',
    }, { status: 500 })
  }
}
