import { notFound, redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import DayLearning from '@/components/DayLearning'

export default async function DayLearningPage({ params }: { params: Promise<{ id: string; day: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/login')

  const { id, day: dayStr } = await params
  const day = parseInt(dayStr, 10)
  if (!Number.isInteger(day) || day < 1) notFound()

  const goal = await prisma.goal.findFirst({
    where: { id, userId: session.user.id },
    select: {
      id: true,
      title: true,
      durationDays: true,
      tasks: { select: { day: true, title: true, description: true, type: true, completed: true }, orderBy: { day: 'asc' } },
    },
  })

  if (!goal) notFound()

  const task = goal.tasks.find(t => t.day === day) ?? null
  const maxDay = goal.tasks.reduce((m, t) => Math.max(m, t.day), 0)
  const totalDays = goal.durationDays || maxDay || day

  const [passedAttempt, lastAttempt] = await Promise.all([
    prisma.quizAttempt.findFirst({
      where: { goalId: goal.id, day, userId: session.user.id, passed: true },
      select: { id: true },
    }),
    prisma.quizAttempt.findFirst({
      where: { goalId: goal.id, day, userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      select: { score: true, total: true, passed: true },
    }),
  ])

  return (
    <DayLearning
      goalId={goal.id}
      goalTitle={goal.title}
      day={day}
      totalDays={totalDays}
      task={task}
      initialQuizPassed={Boolean(passedAttempt)}
      lastAttempt={lastAttempt}
    />
  )
}
