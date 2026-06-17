'use client'
import Link from 'next/link'
import { memo, useCallback, useMemo, useState } from 'react'
import { Target, ChevronDown, ChevronUp, CheckCircle, Circle, Clock, BookOpen, Trash2, ExternalLink, Route } from 'lucide-react'
import type { Goal, Milestone } from '@/types/goal'

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-indigo-500/20 text-indigo-300',
  COMPLETED: 'bg-emerald-500/20 text-emerald-300',
  PAUSED: 'bg-yellow-500/20 text-yellow-300',
  ABANDONED: 'bg-red-500/20 text-red-300',
}

const RESOURCE_LABELS: Record<string, string> = {
  book: 'Book',
  course: 'Course',
  video: 'Video',
  article: 'Article',
  tool: 'Tool',
  practice: 'Practice',
}

interface GoalCardProps {
  goal: Goal
  onDeleted: (goalId: string) => void
  onMilestoneUpdated: (goalId: string, milestone: Milestone) => void
}

function GoalCard({ goal, onDeleted, onMilestoneUpdated }: GoalCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [loadingMilestone, setLoadingMilestone] = useState<string | null>(null)

  // Prefer day-by-day task progress; fall back to milestones for older goals.
  const { completed, total, progress, unit } = useMemo(() => {
    const tasks = goal.tasks ?? []
    if (tasks.length > 0) {
      const completed = tasks.reduce((n, t) => (t.completed ? n + 1 : n), 0)
      return { completed, total: tasks.length, progress: Math.round((completed / tasks.length) * 100), unit: 'days' }
    }
    const total = goal.milestones.length
    const completed = goal.milestones.reduce((n, m) => (m.status === 'COMPLETED' ? n + 1 : n), 0)
    return { completed, total, progress: total > 0 ? Math.round((completed / total) * 100) : 0, unit: 'milestones' }
  }, [goal.milestones, goal.tasks])

  const toggleExpanded = useCallback(() => setExpanded(value => !value), [])

  const toggleMilestone = useCallback(async (m: Milestone) => {
    setLoadingMilestone(m.id)
    const newStatus = m.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED'
    onMilestoneUpdated(goal.id, { ...m, status: newStatus })

    try {
      const res = await fetch(`/api/milestones/${m.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Failed to update milestone')
      if (data.milestone) onMilestoneUpdated(goal.id, data.milestone)
      if (data.feedback) setFeedback(data.feedback)
    } catch (error) {
      onMilestoneUpdated(goal.id, m)
      console.error(error)
    } finally {
      setLoadingMilestone(null)
    }
  }, [goal.id, onMilestoneUpdated])

  const deleteGoal = useCallback(async () => {
    if (!confirm('Delete this goal and all its milestones?')) return

    try {
      const res = await fetch(`/api/goals/${goal.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete goal')
      onDeleted(goal.id)
    } catch (error) {
      console.error(error)
    }
  }, [goal.id, onDeleted])

  return (
    <div className="glass card-glow rounded-2xl overflow-hidden">
      <div className="p-6">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2 flex-1">
            <div className="w-8 h-8 bg-indigo-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
              <Target size={14} className="text-indigo-400" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-sm leading-snug">{goal.title}</h3>
              <span className="text-xs text-white/40">{goal.category}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 ml-2">
            <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[goal.status]}`}>
              {goal.status.toLowerCase()}
            </span>
            <button onClick={deleteGoal} className="text-white/20 hover:text-red-400 transition-colors">
              <Trash2 size={13} />
            </button>
          </div>
        </div>

        <p className="text-white/50 text-xs leading-relaxed mb-4 line-clamp-2">{goal.description}</p>

        <div className="mb-4">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-white/40">Progress</span>
            <span className="text-white/70 font-medium">{progress}% ({completed}/{total} {unit})</span>
          </div>
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-400 via-indigo-400 to-violet-500 rounded-full transition-all duration-700"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {feedback && (
          <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-3 mb-4 text-xs text-indigo-200 leading-relaxed">
            AI feedback: {feedback}
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          <button
            onClick={toggleExpanded}
            className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors"
          >
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            {expanded ? 'Hide details' : `View ${goal.milestones.length} milestones & resources`}
          </button>
          <Link
            href={`/goals/${goal.id}`}
            className="flex items-center gap-1.5 text-xs text-cyan-200/70 hover:text-cyan-100 transition-colors"
          >
            <Route size={13} />
            Roadmap
          </Link>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-white/5 px-6 pb-6 pt-4 space-y-5">
          <div>
            <h4 className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Clock size={11} />
              Milestones
            </h4>
            <div className="space-y-2">
              {goal.milestones.map(m => (
                <div
                  key={m.id}
                  className={`flex items-start gap-3 p-3 rounded-xl transition-colors ${
                    m.status === 'COMPLETED' ? 'bg-emerald-500/5' : 'bg-white/3 hover:bg-white/5'
                  }`}
                >
                  <button
                    onClick={() => toggleMilestone(m)}
                    disabled={loadingMilestone === m.id}
                    className="flex-shrink-0 mt-0.5"
                  >
                    {m.status === 'COMPLETED'
                      ? <CheckCircle size={16} className="text-emerald-400" />
                      : <Circle size={16} className="text-white/30 hover:text-indigo-400 transition-colors" />
                    }
                  </button>
                  <div className="min-w-0">
                    <p className={`text-xs font-medium ${m.status === 'COMPLETED' ? 'text-white/40 line-through' : 'text-white/80'}`}>
                      {m.title}
                    </p>
                    <p className="text-white/30 text-xs mt-0.5 leading-relaxed">{m.description}</p>
                    {m.dueDate && (
                      <p className="text-white/25 text-xs mt-1">
                        Due: {new Date(m.dueDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {goal.resources.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <BookOpen size={11} />
                Resources
              </h4>
              <div className="space-y-2">
                {goal.resources.map(r => (
                  <div key={r.id} className="flex items-center gap-2 text-xs text-white/60">
                    <span className="text-white/35">{RESOURCE_LABELS[r.type] || 'Resource'}</span>
                    {r.url ? (
                      <a href={r.url} target="_blank" rel="noreferrer" className="hover:text-indigo-300 flex items-center gap-1 transition-colors">
                        {r.title} <ExternalLink size={10} />
                      </a>
                    ) : (
                      <span>{r.title}</span>
                    )}
                    <span className="text-white/20 text-xs">({r.type})</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default memo(GoalCard)
