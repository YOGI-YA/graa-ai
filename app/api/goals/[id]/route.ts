import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const goal = await prisma.goal.findFirst({
    where: { id, userId: session.user.id },
    select: {
      id: true,
      title: true,
      description: true,
      category: true,
      status: true,
      targetDate: true,
      durationDays: true,
      skillLevel: true,
      planJson: true,
      milestones: {
        select: {
          id: true,
          title: true,
          description: true,
          status: true,
          dueDate: true,
          order: true,
        },
        orderBy: { order: 'asc' },
      },
      resources: {
        select: {
          id: true,
          title: true,
          url: true,
          type: true,
        },
      },
      tasks: {
        select: {
          id: true,
          day: true,
          week: true,
          phase: true,
          title: true,
          description: true,
          type: true,
          platform: true,
          url: true,
          completed: true,
        },
        orderBy: [{ week: 'asc' }, { day: 'asc' }, { createdAt: 'asc' }],
      },
    },
  })

  if (!goal) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(goal)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  await prisma.goal.deleteMany({ where: { id, userId: session.user.id } })
  return NextResponse.json({ success: true })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const data = await req.json()
  const goal = await prisma.goal.updateMany({
    where: { id, userId: session.user.id },
    data,
  })
  return NextResponse.json(goal)
}
