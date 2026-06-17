import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { Lock, ArrowLeft } from 'lucide-react'
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

  // Gating: a day unlocks only when every earlier day is complete.
  const sorted = [...goal.tasks].sort((a, b) => a.day - b.day)
  const firstIncomplete = sorted.find(t => !t.completed)?.day ?? (maxDay || day)
  if (goal.tasks.length > 0 && day > firstIncomplete) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 text-white">
        <div className="glass-strong rounded-3xl p-10 max-w-md text-center fade-up">
          <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-5">
            <Lock size={20} className="text-orange-400" />
          </div>
          <h1 className="display text-2xl mb-2">Day {day} is locked</h1>
          <p className="text-white/55 text-sm mb-7">Finish <span className="text-white/80">Day {firstIncomplete}</span> first — complete each day to unlock the next.</p>
          <div className="flex items-center justify-center gap-2.5">
            <Link href={`/goals/${goal.id}/day/${firstIncomplete}`} className="btn-primary px-5 py-2.5 text-sm">Go to Day {firstIncomplete}</Link>
            <Link href={`/goals/${goal.id}`} className="btn-ghost px-5 py-2.5 text-sm flex items-center gap-1.5"><ArrowLeft size={15} /> Roadmap</Link>
          </div>
        </div>
      </div>
    )
  }

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
