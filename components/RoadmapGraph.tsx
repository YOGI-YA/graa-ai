'use client'
import Link from 'next/link'
import { useCallback, useMemo, useState } from 'react'
import { ArrowLeft, CheckCircle2, ChevronLeft, Circle, Lock, Play, Sparkles, Trophy } from 'lucide-react'
import type { Goal, Milestone } from '@/types/goal'
import AppNav from '@/components/AppNav'

function isUnlocked(milestones: Milestone[], index: number) {
  if (index === 0) return true
  return milestones[index - 1]?.status === 'COMPLETED'
}

function makeLessonNodes(milestone: Milestone, resourceTitles: string[]) {
  const sentences = milestone.description
    .split(/[.!?]/)
    .map(part => part.trim())
    .filter(Boolean)

  const nodes = [
    {
      title: 'Understand the mission',
      description: sentences[0] || milestone.description,
    },
    {
      title: 'Practice the core skill',
      description: sentences[1] || 'Turn the idea into a focused hands-on exercise.',
    },
    {
      title: 'Use the best resource',
      description: resourceTitles[0] ? `Start with ${resourceTitles[0]}.` : 'Use one focused resource and take concise notes.',
    },
    {
      title: 'Build proof',
      description: 'Create a small output you can review before moving ahead.',
    },
  ]

  return nodes
}

export default function RoadmapGraph({ initialGoal }: { initialGoal: Goal }) {
  const [goal, setGoal] = useState(initialGoal)
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string | null>(null)
  const [loadingMilestone, setLoadingMilestone] = useState<string | null>(null)

  const milestones = useMemo(() => (
    [...goal.milestones].sort((a, b) => a.order - b.order)
  ), [goal.milestones])

  const selectedMilestone = useMemo(() => (
    milestones.find(milestone => milestone.id === selectedMilestoneId) ?? null
  ), [milestones, selectedMilestoneId])

  const selectedIndex = selectedMilestone
    ? milestones.findIndex(milestone => milestone.id === selectedMilestone.id)
    : -1

  const resourceTitles = useMemo(() => goal.resources.map(resource => resource.title), [goal.resources])

  const tasks = useMemo(() => (
    [...(goal.tasks ?? [])].sort((a, b) => a.day - b.day)
  ), [goal.tasks])

  const nextTask = useMemo(() => tasks.find(t => !t.completed) ?? null, [tasks])
  const doneCount = useMemo(() => tasks.filter(t => t.completed).length, [tasks])
  const pct = tasks.length ? Math.round((doneCount / tasks.length) * 100) : 0
  // A day unlocks only when every earlier day is complete.
  const firstIncompleteDay = useMemo(() => (
    tasks.find(t => !t.completed)?.day ?? (tasks.length ? tasks[tasks.length - 1].day : 1)
  ), [tasks])

  const updateMilestone = useCallback(async (milestone: Milestone, status: string) => {
    setLoadingMilestone(milestone.id)
    setGoal(current => ({
      ...current,
      milestones: current.milestones.map(item => (
        item.id === milestone.id ? { ...item, status } : item
      )),
    }))

    try {
      const res = await fetch(`/api/milestones/${milestone.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Failed to update milestone')
      if (data.milestone) {
        setGoal(current => ({
          ...current,
          milestones: current.milestones.map(item => (
            item.id === data.milestone.id ? { ...item, ...data.milestone } : item
          )),
        }))
      }
    } catch (error) {
      console.error(error)
      setGoal(current => ({
        ...current,
        milestones: current.milestones.map(item => (
          item.id === milestone.id ? milestone : item
        )),
      }))
    } finally {
      setLoadingMilestone(null)
    }
  }, [])

  return (
    <div className="min-h-screen text-white overflow-hidden">
      <AppNav />
      <div className="absolute inset-0 pointer-events-none opacity-70">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(34,211,238,0.13),transparent_28%),radial-gradient(circle_at_82%_20%,rgba(99,102,241,0.16),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.04),transparent_34%)]" />
        <div className="absolute left-0 right-0 top-28 h-px bg-gradient-to-r from-transparent via-cyan-300/20 to-transparent" />
      </div>

      <main className={`relative max-w-6xl mx-auto px-4 sm:px-8 py-6 sm:py-8 transition-all duration-700 ${selectedMilestone ? 'scale-[1.02]' : 'scale-100'}`}>
        <div className="flex items-center justify-between gap-4 mb-8">
          <Link href="/dashboard" className="text-white/45 hover:text-white transition-colors flex items-center gap-2 text-sm">
            <ArrowLeft size={16} />
            Dashboard
          </Link>
          <div className="text-xs text-white/35">{goal.category}</div>
        </div>

        <section className={`transition-all duration-700 ${selectedMilestone ? 'opacity-0 scale-95 pointer-events-none absolute inset-x-4 sm:inset-x-8 top-20' : 'opacity-100 scale-100'}`}>
          <div className="max-w-3xl mb-10">
            <div className="inline-flex items-center gap-2 bg-cyan-400/10 border border-cyan-300/20 rounded-full px-3 py-1 text-xs text-cyan-100 mb-4">
              <Sparkles size={13} />
              Learning Roadmap
            </div>
            <h1 className="text-3xl sm:text-5xl font-semibold leading-tight">{goal.title}</h1>
            <p className="text-white/52 text-sm sm:text-base leading-relaxed mt-4">{goal.description}</p>

            {tasks.length > 0 && (
              <div className="mt-7 max-w-md">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-white/45">{doneCount} of {tasks.length} days complete</span>
                  <span className="text-white/70 font-medium">{pct}%</span>
                </div>
                <div className="h-2 bg-white/8 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-cyan-400 via-indigo-400 to-violet-500 rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
                </div>
                <Link
                  href={`/goals/${goal.id}/day/${nextTask ? nextTask.day : tasks[0].day}`}
                  className="btn-primary px-5 py-2.5 text-sm inline-flex items-center gap-2 mt-4"
                >
                  <Play size={15} />
                  {nextTask ? `Continue · Day ${nextTask.day}` : 'Review from Day 1'}
                </Link>
              </div>
            )}
          </div>

          <div className="relative pb-10">
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-cyan-300/50 via-white/12 to-transparent hidden md:block" />
            <div className="space-y-7">
              {milestones.map((milestone, index) => {
                const unlocked = isUnlocked(milestones, index)
                const completed = milestone.status === 'COMPLETED'
                const side = index % 2 === 0 ? 'md:pr-[52%]' : 'md:pl-[52%]'

                return (
                  <div key={milestone.id} className={`relative ${side}`}>
                    <button
                      onClick={() => unlocked && setSelectedMilestoneId(milestone.id)}
                      disabled={!unlocked}
                      className={`w-full text-left rounded-2xl border p-5 transition-all duration-300 ${
                        unlocked
                          ? 'bg-white/[0.06] border-white/12 hover:border-cyan-300/45 hover:bg-cyan-300/[0.07] hover:-translate-y-1'
                          : 'bg-white/[0.025] border-white/6 opacity-55'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                          completed ? 'bg-emerald-400 text-emerald-950' : unlocked ? 'bg-cyan-300 text-cyan-950' : 'bg-white/8 text-white/35'
                        }`}>
                          {completed ? <CheckCircle2 size={21} /> : unlocked ? <Play size={18} /> : <Lock size={17} />}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs text-white/36 mb-1">Phase {index + 1}</div>
                          <h2 className="font-semibold text-base sm:text-lg leading-snug">{milestone.title}</h2>
                          <p className="text-white/45 text-sm leading-relaxed mt-2 line-clamp-2">{milestone.description}</p>
                        </div>
                      </div>
                    </button>
                    <div className="absolute left-1/2 top-8 -translate-x-1/2 w-4 h-4 rounded-full bg-[#080914] border border-cyan-200/35 hidden md:block" />
                  </div>
                )
              })}
              <div className="relative flex justify-center">
                <div className="w-14 h-14 rounded-3xl bg-white/6 border border-white/10 flex items-center justify-center text-white/45">
                  <Trophy size={22} />
                </div>
              </div>
            </div>
          </div>

          {tasks.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Daily lessons</h2>
                <span className="text-xs text-white/35">{tasks.filter(t => t.completed).length}/{tasks.length} done</span>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {tasks.map(task => {
                  const locked = task.day > firstIncompleteDay
                  if (locked) {
                    return (
                      <div
                        key={task.id}
                        title="Complete the previous day to unlock"
                        className="flex items-start gap-3 rounded-xl border border-white/8 p-3 opacity-50 cursor-not-allowed"
                      >
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-white/5 text-white/30">
                          <Lock size={14} />
                        </div>
                        <div className="min-w-0">
                          <div className="text-[11px] text-white/30">Day {task.day}{task.type ? ` · ${task.type}` : ''}</div>
                          <div className="text-sm font-medium truncate text-white/45">{task.title}</div>
                        </div>
                      </div>
                    )
                  }
                  return (
                    <Link
                      key={task.id}
                      href={`/goals/${goal.id}/day/${task.day}`}
                      className="group flex items-start gap-3 rounded-xl border border-white/8 hover:border-orange-300/40 hover:bg-orange-300/[0.05] transition-all p-3"
                    >
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-xs font-semibold ${
                        task.completed ? 'bg-emerald-400 text-emerald-950' : 'bg-orange-400/15 text-orange-200'
                      }`}>
                        {task.completed ? <CheckCircle2 size={16} /> : task.day}
                      </div>
                      <div className="min-w-0">
                        <div className="text-[11px] text-white/35">Day {task.day}{task.type ? ` · ${task.type}` : ''}</div>
                        <div className="text-sm font-medium truncate group-hover:text-orange-100 transition-colors">{task.title}</div>
                      </div>
                      <Play size={15} className="ml-auto text-white/25 group-hover:text-orange-300 transition-colors flex-shrink-0 mt-1" />
                    </Link>
                  )
                })}
              </div>
            </div>
          )}
        </section>

        {selectedMilestone && (
          <section className="animate-[roadmapDive_520ms_ease-out]">
            <button
              onClick={() => setSelectedMilestoneId(null)}
              className="text-white/45 hover:text-white transition-colors flex items-center gap-2 text-sm mb-8"
            >
              <ChevronLeft size={16} />
              Back to roadmap
            </button>

            <div className="max-w-3xl mb-10">
              <div className="inline-flex items-center gap-2 bg-emerald-400/10 border border-emerald-300/20 rounded-full px-3 py-1 text-xs text-emerald-100 mb-4">
                Phase {selectedIndex + 1}
              </div>
              <h1 className="text-3xl sm:text-5xl font-semibold leading-tight">{selectedMilestone.title}</h1>
              <p className="text-white/52 text-sm sm:text-base leading-relaxed mt-4">{selectedMilestone.description}</p>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              {makeLessonNodes(selectedMilestone, resourceTitles).map((node, index) => {
                const unlocked = index === 0
                return (
                  <div key={node.title} className="relative">
                    {index > 0 && <div className="hidden md:block absolute top-10 right-full w-4 h-px bg-white/12" />}
                    <div className={`h-full rounded-2xl border p-5 ${
                      unlocked
                        ? 'bg-emerald-300/[0.08] border-emerald-200/30'
                        : 'bg-white/[0.025] border-white/6 opacity-55'
                    }`}>
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${
                        unlocked ? 'bg-emerald-300 text-emerald-950' : 'bg-white/8 text-white/35'
                      }`}>
                        {unlocked ? <Circle size={18} /> : <Lock size={16} />}
                      </div>
                      <div className="text-xs text-white/35 mb-1">Module {index + 1}</div>
                      <h2 className="font-semibold text-sm leading-snug">{node.title}</h2>
                      <p className="text-white/45 text-xs leading-relaxed mt-2">{node.description}</p>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="mt-8 flex justify-end">
              <button
                onClick={() => updateMilestone(selectedMilestone, selectedMilestone.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED')}
                disabled={loadingMilestone === selectedMilestone.id}
                className="bg-cyan-300 hover:bg-cyan-200 disabled:opacity-60 text-cyan-950 rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors flex items-center gap-2"
              >
                {loadingMilestone === selectedMilestone.id ? (
                  <span className="w-4 h-4 rounded-full border-2 border-cyan-950/30 border-t-cyan-950 animate-spin" />
                ) : (
                  <CheckCircle2 size={16} />
                )}
                {selectedMilestone.status === 'COMPLETED' ? 'Mark as active' : 'Complete day'}
              </button>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
