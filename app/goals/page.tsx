'use client'
import { useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2, Target, Plus, ArrowRight, CalendarDays } from 'lucide-react'
import AppNav from '@/components/AppNav'
import type { Goal } from '@/types/goal'
import { useTranslation } from '@/lib/LanguageContext'

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-indigo-500/20 text-indigo-200',
  COMPLETED: 'bg-emerald-500/20 text-emerald-200',
  PAUSED: 'bg-yellow-500/20 text-yellow-200',
  ABANDONED: 'bg-red-500/20 text-red-200',
}

function progressOf(goal: Goal) {
  const tasks = goal.tasks ?? []
  if (tasks.length > 0) {
    const done = tasks.filter(t => t.completed).length
    return { done, total: tasks.length, pct: Math.round((done / tasks.length) * 100), unit: 'days' }
  }
  const total = goal.milestones.length
  const done = goal.milestones.filter(m => m.status === 'COMPLETED').length
  return { done, total, pct: total ? Math.round((done / total) * 100) : 0, unit: 'milestones' }
}

export default function GoalsPage() {
  const { data: session, status } = useSession()
  const { t } = useTranslation()
  const router = useRouter()
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
  }, [status, router])

  useEffect(() => {
    if (status !== 'authenticated') return
    fetch('/api/goals')
      .then(r => (r.ok ? r.json() : []))
      .then(d => Array.isArray(d) && setGoals(d))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [status])

  const firstName = useMemo(() => session?.user?.name?.split(' ')[0] ?? '', [session?.user?.name])

  return (
    <div className="min-h-screen text-white">
      <AppNav firstName={firstName} />
      <main className="max-w-6xl mx-auto px-4 sm:px-8 py-8">
        <div className="flex items-end justify-between gap-4 mb-8 fade-up">
          <div>
            <h1 className="display text-3xl sm:text-4xl">{t('goals.title') || 'Your goals'}</h1>
            <p className="text-white/50 text-sm mt-2">{t('goals.subtitle') || 'Pick a goal to open its roadmap and daily lessons.'}</p>
          </div>
          <Link href="/dashboard" className="btn-primary px-4 py-2 text-sm flex items-center gap-2">
            <Plus size={16} /> {t('goals.newGoal') || 'New goal'}
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 size={28} className="animate-spin text-cyan-300" />
          </div>
        ) : goals.length === 0 ? (
          <div className="glass rounded-3xl p-12 text-center fade-up">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 border border-indigo-400/15 flex items-center justify-center mx-auto mb-4">
              <Target size={22} className="text-indigo-200" />
            </div>
            <h2 className="text-xl font-semibold">{t('goals.noGoalsFound') || 'No goals yet'}</h2>
            <p className="text-white/50 text-sm mt-2 mb-6">{t('dashboard.noGoalsDesc') || 'Create your first goal and the AI will build a day-by-day roadmap.'}</p>
            <Link href="/dashboard" className="btn-primary px-5 py-2.5 text-sm inline-flex items-center gap-2">
              {t('dashboard.createGoalBtn') || 'Create a goal'} <ArrowRight size={16} />
            </Link>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 stagger">
            {goals.map((goal, i) => {
              const p = progressOf(goal)
              return (
                <Link
                  key={goal.id}
                  href={`/goals/${goal.id}`}
                  className="glass card-glow rounded-2xl p-5 flex flex-col group"
                  style={{ ['--i' as string]: i }}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="w-9 h-9 rounded-xl bg-indigo-500/12 flex items-center justify-center flex-shrink-0">
                      <Target size={16} className="text-indigo-300" />
                    </div>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full ${STATUS_COLORS[goal.status] || 'bg-white/10 text-white/60'}`}>
                      {goal.status.toLowerCase()}
                    </span>
                  </div>
                  <h3 className="font-semibold leading-snug group-hover:text-cyan-100 transition-colors">{goal.title}</h3>
                  <p className="text-white/45 text-xs mt-1 line-clamp-2 flex-1">{goal.description}</p>

                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-white/40 flex items-center gap-1">
                        <CalendarDays size={12} /> {goal.durationDays ? `${goal.durationDays} ${t('roadmap.days') || 'days'}` : goal.category}
                      </span>
                      <span className="text-white/70 font-medium">{p.pct}%</span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-cyan-400 via-indigo-400 to-violet-500 rounded-full transition-all duration-700" style={{ width: `${p.pct}%` }} />
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
