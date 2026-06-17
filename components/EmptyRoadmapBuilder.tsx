'use client'
import { useRouter } from 'next/navigation'
import { useCallback, useMemo, useState } from 'react'
import { ArrowUp, BookOpen, CalendarDays, Check, Loader2, Route, Sparkles } from 'lucide-react'
import type { Goal } from '@/types/goal'

interface DraftMilestone {
  title: string
  description: string
  dueDate?: string | null
  order: number
}

interface DraftResource {
  title: string
  url?: string | null
  type: string
}

interface DraftDay {
  day: number
  week?: number
  phase?: string
  title: string
  description: string
  type: string
}

interface RoadmapDraft {
  title: string
  description: string
  category: string
  targetDate?: string | null
  durationDays?: number | null
  skillLevel?: string | null
  milestones: DraftMilestone[]
  resources: DraftResource[]
  days?: DraftDay[]
  advice: string
}

const SKILL_LEVELS = ['beginner', 'intermediate', 'advanced']

export default function EmptyRoadmapBuilder({ onCreated }: { onCreated: (goal: Goal) => void }) {
  const router = useRouter()
  const [prompt, setPrompt] = useState('')
  const [days, setDays] = useState('')
  const [skillLevel, setSkillLevel] = useState('')
  const [roadmap, setRoadmap] = useState<RoadmapDraft | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const promptPlaceholder = useMemo(() => (
    roadmap
      ? 'Ask the AI to adjust the roadmap...'
      : 'Tell the AI what you want to learn or achieve...'
  ), [roadmap])

  const generateRoadmap = useCallback(async () => {
    if (!prompt.trim() || loading || saving) return

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/roadmap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          roadmap,
          durationDays: days ? Number(days) : undefined,
          skillLevel: skillLevel || undefined,
        }),
      })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Failed to generate roadmap')

      setRoadmap(data.roadmap)
      setPrompt('')
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to generate roadmap')
    } finally {
      setLoading(false)
    }
  }, [days, loading, prompt, roadmap, saving, skillLevel])

  const beginRoadmap = useCallback(async () => {
    if (!roadmap || saving) return

    setSaving(true)
    setError('')

    try {
      const res = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(roadmap),
      })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Failed to create goal')

      onCreated(data.goal)
      router.push(`/goals/${data.goal.id}`)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create goal')
      setSaving(false)
    }
  }, [onCreated, roadmap, router, saving])

  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      generateRoadmap()
    }
  }, [generateRoadmap])

  return (
    <section className="min-h-[calc(100vh-73px)] pb-40">
      <div className="max-w-4xl mx-auto px-4 sm:px-8 pt-10 sm:pt-14">
        {roadmap ? (
          <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 bg-cyan-500/10 border border-cyan-400/20 rounded-full px-3 py-1 text-xs text-cyan-200 mb-4">
                  <Route size={13} />
                  {roadmap.category}
                </div>
                <h1 className="text-3xl sm:text-5xl font-semibold tracking-normal leading-tight max-w-3xl">
                  {roadmap.title}
                </h1>
                <p className="text-white/55 mt-4 text-sm sm:text-base leading-relaxed max-w-2xl">
                  {roadmap.description}
                </p>
              </div>
              <button
                onClick={beginRoadmap}
                disabled={saving}
                className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-emerald-950 px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 min-w-28"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                Begin
              </button>
            </div>

            <div className="grid gap-3">
              {roadmap.milestones
                .slice()
                .sort((a, b) => a.order - b.order)
                .map((milestone, index) => (
                  <div key={`${milestone.order}-${milestone.title}`} className="glass rounded-xl p-4 sm:p-5">
                    <div className="flex gap-4">
                      <div className="w-8 h-8 rounded-lg bg-indigo-500/15 text-indigo-200 flex items-center justify-center text-sm font-semibold flex-shrink-0">
                        {index + 1}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                          <h2 className="font-semibold text-sm sm:text-base">{milestone.title}</h2>
                          {milestone.dueDate && (
                            <span className="inline-flex items-center gap-1 text-[11px] text-white/40">
                              <CalendarDays size={12} />
                              {new Date(milestone.dueDate).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        <p className="text-white/52 text-sm leading-relaxed">{milestone.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
            </div>

            {roadmap.days && roadmap.days.length > 0 && (
              <div className="glass rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <CalendarDays size={16} className="text-cyan-300" />
                    Day-by-day plan
                  </div>
                  <span className="text-[11px] text-white/40">{roadmap.days.length} days</span>
                </div>
                <div className="space-y-1.5 max-h-80 overflow-y-auto chat-scroll pr-1">
                  {roadmap.days
                    .slice()
                    .sort((a, b) => a.day - b.day)
                    .map(d => (
                      <div key={d.day} className="flex items-start gap-3 rounded-lg px-2 py-1.5 hover:bg-white/[0.04] transition-colors">
                        <span className="text-[11px] font-semibold text-cyan-200/80 bg-cyan-400/10 rounded-md px-2 py-0.5 flex-shrink-0 mt-0.5">
                          Day {d.day}
                        </span>
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">{d.title}</div>
                          {d.description && <p className="text-white/45 text-xs leading-relaxed mt-0.5">{d.description}</p>}
                        </div>
                        <span className="ml-auto text-[10px] uppercase tracking-wide text-white/30 flex-shrink-0 mt-1">{d.type}</span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="glass rounded-xl p-5">
                <div className="flex items-center gap-2 text-sm font-semibold mb-3">
                  <Sparkles size={16} className="text-cyan-300" />
                  Mentor Note
                </div>
                <p className="text-white/58 text-sm leading-relaxed">{roadmap.advice}</p>
              </div>
              <div className="glass rounded-xl p-5">
                <div className="flex items-center gap-2 text-sm font-semibold mb-3">
                  <BookOpen size={16} className="text-emerald-300" />
                  Resources
                </div>
                <div className="space-y-2">
                  {roadmap.resources.map(resource => (
                    <div key={`${resource.type}-${resource.title}`} className="text-sm text-white/58 flex items-center justify-between gap-3">
                      <span className="truncate">{resource.title}</span>
                      <span className="text-[11px] uppercase tracking-normal text-white/32 flex-shrink-0">{resource.type}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="min-h-[calc(100vh-260px)] flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 border border-indigo-400/15 flex items-center justify-center mb-6">
              <Sparkles size={22} className="text-indigo-200" />
            </div>
            <h1 className="text-3xl sm:text-5xl font-semibold tracking-normal">What should we build toward?</h1>
            <p className="text-white/48 mt-4 max-w-xl text-sm sm:text-base leading-relaxed">
              Describe the outcome you want, your current level, and any deadline. The AI will shape it into a day-by-day roadmap before anything is saved.
            </p>
          </div>
        )}
      </div>

      <div className="fixed left-0 right-0 bottom-0 z-30 bg-[#0a0c18] border-t border-white/8">
        <div className="max-w-4xl mx-auto px-4 sm:px-8 py-4">
          {error && <p className="text-red-300 text-xs mb-2">{error}</p>}
          {!roadmap && (
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <label className="flex items-center gap-1.5 text-xs text-white/45">
                <CalendarDays size={13} className="text-cyan-300/70" />
                <input
                  type="number"
                  min={1}
                  max={90}
                  value={days}
                  onChange={e => setDays(e.target.value)}
                  placeholder="Days (auto)"
                  className="w-24 bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-white placeholder-white/30 focus:outline-none focus:border-cyan-400/50"
                />
              </label>
              <select
                value={skillLevel}
                onChange={e => setSkillLevel(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-white/60 focus:outline-none focus:border-cyan-400/50"
              >
                <option value="">Skill level</option>
                {SKILL_LEVELS.map(level => (
                  <option key={level} value={level} className="bg-gray-900 capitalize">{level}</option>
                ))}
              </select>
              <span className="text-[11px] text-white/30">Leave days empty and the AI picks a sensible length.</span>
            </div>
          )}
          <div className="glass rounded-2xl p-2 flex items-end gap-2">
            <textarea
              value={prompt}
              onChange={event => setPrompt(event.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              placeholder={promptPlaceholder}
              className="min-h-12 max-h-32 flex-1 resize-none bg-transparent px-3 py-3 text-sm text-white placeholder-white/32 focus:outline-none"
            />
            <button
              onClick={generateRoadmap}
              disabled={loading || saving || !prompt.trim()}
              className="w-10 h-10 rounded-xl bg-white text-black hover:bg-cyan-100 disabled:opacity-40 disabled:hover:bg-white transition-colors flex items-center justify-center flex-shrink-0"
              aria-label={roadmap ? 'Update roadmap' : 'Generate roadmap'}
            >
              {loading ? <Loader2 size={17} className="animate-spin" /> : <ArrowUp size={18} />}
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
