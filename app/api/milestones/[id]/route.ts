import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma, ensureDatabaseSchema } from '@/lib/prisma'
import { getAdaptiveFeedback } from '@/lib/groq'
import { logger } from '@/lib/logger'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await ensureDatabaseSchema()
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id } = await params
    const { status } = await req.json()

    const existing = await prisma.milestone.findFirst({
      where: { id, goal: { userId: session.user.id } },
      select: { id: true },
    })

    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const milestone = await prisma.milestone.update({
      where: { id },
      data: { status },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        dueDate: true,
        order: true,
        goal: {
          select: {
            title: true,
            milestones: {
              select: {
                title: true,
                status: true,
              },
              orderBy: { order: 'asc' },
            },
          },
        },
      },
    })
    let feedback = null
    if (status === 'COMPLETED') {
      const completed = milestone.goal.milestones.filter((m: { status: string }) => m.status === 'COMPLETED').length
      const total = milestone.goal.milestones.length
      const nextPending = milestone.goal.milestones.find((m: { status: string; title: string }) => m.status === 'PENDING')
      feedback = await getAdaptiveFeedback(
        milestone.goal.title, completed, total, nextPending?.title
      )
    }
    return NextResponse.json({
      milestone: {
        id: milestone.id,
        title: milestone.title,
        description: milestone.description,
        status: milestone.status,
        dueDate: milestone.dueDate,
        order: milestone.order,
      },
      feedback,
    })
  } catch (error) {
    logger.error('API /milestones/[id] PATCH', 'Failed to update milestone', error)
    return NextResponse.json({ error: 'Failed to update milestone' }, { status: 500 })
  }
}

