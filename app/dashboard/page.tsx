'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, Loader2, Flame, ArrowRight, PlayCircle, BookOpen } from 'lucide-react'
import GoalCard from '@/components/GoalCard'
import NewGoalModal from '@/components/NewGoalModal'
import EmptyRoadmapBuilder from '@/components/EmptyRoadmapBuilder'
import AppNav from '@/components/AppNav'
import type { Goal, Milestone } from '@/types/goal'

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

export default function Dashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewGoal, setShowNewGoal] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
  }, [status, router])

  useEffect(() => {
    if (status !== 'authenticated') return
    const controller = new AbortController()
    fetch('/api/goals', { signal: controller.signal })
      .then(async res => { if (res.ok) setGoals(await res.json()) })
      .catch(error => {
        if (!(error instanceof DOMException && error.name === 'AbortError')) console.error('Failed to fetch goals', error)
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [status])

  const firstName = useMemo(() => session?.user?.name?.split(' ')[0] ?? '', [session?.user?.name])

  const stats = useMemo(() => {
    let totalLessons = 0
    let completedLessons = 0
    let completedGoals = 0
    for (const goal of goals) {
      if (goal.status === 'COMPLETED') completedGoals += 1
      const tasks = goal.tasks ?? []
      if (tasks.length > 0) {
        totalLessons += tasks.length
        completedLessons += tasks.reduce((n, t) => (t.completed ? n + 1 : n), 0)
      } else {
        totalLessons += goal.milestones.length
        completedLessons += goal.milestones.reduce((n, m) => (m.status === 'COMPLETED' ? n + 1 : n), 0)
      }
    }
    const overall = totalLessons ? Math.round((completedLessons / totalLessons) * 100) : 0
    return { totalLessons, completedLessons, completedGoals, overall, activeGoals: goals.filter(g => g.status === 'ACTIVE').length }
  }, [goals])

  // The "Continue learning" target: the most recent active goal's next unfinished day.
  const resume = useMemo(() => {
    const goal = goals.find(g => g.status === 'ACTIVE' && (g.tasks?.length ?? 0) > 0) ?? goals.find(g => (g.tasks?.length ?? 0) > 0)
    if (!goal) return null
    const tasks = [...(goal.tasks ?? [])].sort((a, b) => a.day - b.day)
    const next = tasks.find(t => !t.completed) ?? null
    const done = tasks.filter(t => t.completed).length
    return { goal, next, done, total: tasks.length, pct: Math.round((done / tasks.length) * 100) }
  }, [goals])

  const openNewGoal = useCallback(() => setShowNewGoal(true), [])
  const closeNewGoal = useCallback(() => setShowNewGoal(false), [])

  const handleGoalCreated = useCallback((goal: Goal) => { setShowNewGoal(false); setGoals(prev => [goal, ...prev]) }, [])
  const handleGoalDeleted = useCallback((goalId: string) => { setGoals(prev => prev.filter(g => g.id !== goalId)) }, [])
  const handleMilestoneUpdated = useCallback((goalId: string, milestone: Milestone) => {
    setGoals(prev => prev.map(goal => goal.id !== goalId ? goal : {
      ...goal,
      milestones: goal.milestones.map(item => (item.id === milestone.id ? { ...item, ...milestone } : item)),
    }))
  }, [])

  if (status === 'loading') {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-cyan-300" size={32} /></div>
  }

  return (
    <div className="min-h-screen text-white">
      <AppNav firstName={firstName} onNewGoal={goals.length > 0 ? openNewGoal : undefined} />

      {loading ? (
        <div className="flex items-center justify-center py-32"><Loader2 className="animate-spin text-cyan-300" size={28} /></div>
      ) : goals.length === 0 ? (
        <EmptyRoadmapBuilder onCreated={handleGoalCreated} />
      ) : (
        <main className="max-w-6xl mx-auto px-4 sm:px-8 py-8">
          {/* Greeting */}
          <div className="mb-8 fade-up">
            <p className="eyebrow text-orange-400">{greeting()}</p>
            <h1 className="display text-3xl sm:text-4xl mt-1.5">{firstName ? `Hey, ${firstName}` : 'Dashboard'}</h1>
          </div>

          {/* Continue learning hero */}
          {resume && (
            <section className="glass-strong rounded-3xl p-6 sm:p-7 mb-8 relative overflow-hidden fade-up" style={{ animationDelay: '60ms' }}>
              <div className="absolute -top-20 -right-10 w-64 h-64 rounded-full pointer-events-none"
                   style={{ background: 'radial-gradient(circle, rgba(255,106,0,0.16), transparent 70%)' }} />
              <div className="relative flex flex-col lg:flex-row lg:items-center gap-6 justify-between">
                <div className="min-w-0">
                  <div className="inline-flex items-center gap-1.5 eyebrow text-orange-400 mb-3">
                    <Flame size={12} /> {resume.next ? 'Pick up where you left off' : 'Goal complete'}
                  </div>
                  <h2 className="text-xl sm:text-2xl font-semibold tracking-tight truncate">{resume.goal.title}</h2>
                  {resume.next ? (
                    <p className="text-white/55 text-sm mt-1.5">
                      Next · <span className="text-white/80">Day {resume.next.day}</span> — {resume.next.title}
                    </p>
                  ) : (
                    <p className="text-white/55 text-sm mt-1.5">You&apos;ve completed every day. Revisit lessons anytime.</p>
                  )}

                  <div className="mt-4 max-w-md">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-white/45">{resume.done} of {resume.total} days</span>
                      <span className="text-white/70 font-medium">{resume.pct}%</span>
                    </div>
                    <div className="h-2 bg-white/8 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-cyan-400 via-indigo-400 to-violet-500 rounded-full transition-all duration-700" style={{ width: `${resume.pct}%` }} />
                    </div>
                  </div>
                </div>

                <div className="flex-shrink-0 flex flex-col sm:flex-row lg:flex-col gap-2.5">
                  <Link
                    href={resume.next ? `/goals/${resume.goal.id}/day/${resume.next.day}` : `/goals/${resume.goal.id}`}
                    className="btn-primary px-6 py-3 text-sm flex items-center justify-center gap-2 group"
                  >
                    <PlayCircle size={17} />
                    {resume.next ? `Continue · Day ${resume.next.day}` : 'Review roadmap'}
                    <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                  <Link href={`/goals/${resume.goal.id}`} className="btn-ghost px-6 py-3 text-sm flex items-center justify-center gap-2">
                    <BookOpen size={16} /> View roadmap
                  </Link>
                </div>
              </div>
            </section>
          )}

          {/* Stat strip */}
          <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-10 stagger">
            {[
              { label: 'Active goals', value: stats.activeGoals },
              { label: 'Lessons done', value: `${stats.completedLessons}/${stats.totalLessons}` },
              { label: 'Overall', value: `${stats.overall}%` },
            ].map((s, i) => (
              <div key={s.label} className="glass rounded-2xl p-4 sm:p-5" style={{ ['--i' as string]: i }}>
                <div className="display text-2xl sm:text-4xl">{s.value}</div>
                <div className="eyebrow text-white/40 mt-2">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Goals */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="display text-xl sm:text-2xl">Your goals</h2>
              <p className="text-white/40 text-sm mt-1">{goals.length} {goals.length === 1 ? 'goal' : 'goals'} · {stats.completedGoals} completed</p>
            </div>
            <button onClick={openNewGoal} className="btn-primary px-4 py-2 text-sm flex items-center gap-2">
              <Plus size={16} /> New goal
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 stagger">
            {goals.map(goal => (
              <GoalCard key={goal.id} goal={goal} onDeleted={handleGoalDeleted} onMilestoneUpdated={handleMilestoneUpdated} />
            ))}
          </div>
        </main>
      )}

      {showNewGoal && <NewGoalModal onClose={closeNewGoal} onCreated={handleGoalCreated} />}
    </div>
  )
}
