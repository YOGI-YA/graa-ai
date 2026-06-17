import { notFound, redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import RoadmapGraph from '@/components/RoadmapGraph'
import type { Goal } from '@/types/goal'

async function getGoal(id: string, userId: string): Promise<Goal | null> {
  const goal = await prisma.goal.findFirst({
    where: { id, userId },
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

  if (!goal) return null

  return {
    ...goal,
    targetDate: goal.targetDate?.toISOString() ?? null,
    milestones: goal.milestones.map(milestone => ({
      ...milestone,
      dueDate: milestone.dueDate?.toISOString() ?? null,
    })),
  }
}

export default async function GoalRoadmapPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/login')

  const { id } = await params
  let goal: Goal | null = null

  try {
    goal = await getGoal(id, session.user.id)
  } catch (error) {
    console.error('Failed to load goal roadmap', error)
  }

  if (!goal) notFound()

  return <RoadmapGraph initialGoal={goal} />
}
