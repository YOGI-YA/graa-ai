import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma, ensureDatabaseSchema } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export async function GET() {
  try {
    await ensureDatabaseSchema()
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        name: true,
        email: true,
        image: true,
        learningStyle: true,
        language: true,
        createdAt: true,
        _count: { select: { goals: true } },
      },
    })
    if (!user) return NextResponse.json({ error: 'User profile not found' }, { status: 404 })

    const completedDays = await prisma.task.count({
      where: { completed: true, goal: { userId: session.user.id } },
    })

    return NextResponse.json({ ...user, completedDays })
  } catch (error) {
    logger.error('PROFILE', 'Failed to fetch user profile', error)
    return NextResponse.json({ error: 'Unable to load profile' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await ensureDatabaseSchema()
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const data: { name?: string; learningStyle?: string | null; language?: string } = {}
    if (typeof body.name === 'string' && body.name.trim()) data.name = body.name.trim()
    if (typeof body.learningStyle === 'string') data.learningStyle = body.learningStyle || null
    if (typeof body.language === 'string' && body.language.trim()) data.language = body.language.trim()

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data,
      select: { name: true, email: true, learningStyle: true, language: true, image: true },
    })

    logger.info('PROFILE', 'User profile updated', { userId: session.user.id })
    return NextResponse.json(user)
  } catch (error) {
    logger.error('PROFILE', 'Failed to update user profile', error)
    return NextResponse.json({ error: 'Failed to update preferences' }, { status: 500 })
  }
}
