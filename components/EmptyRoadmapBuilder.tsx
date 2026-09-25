'use client'
import { useRouter } from 'next/navigation'
import { useCallback, useMemo, useState } from 'react'
import { ArrowUp, BookOpen, CalendarDays, Check, Loader2, Route, Sparkles } from 'lucide-react'
import type { Goal } from '@/types/goal'
import { useTranslation } from '@/lib/LanguageContext'

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
  const { language, t } = useTranslation()
  const [prompt, setPrompt] = useState('')
  const [days, setDays] = useState('')
  const [skillLevel, setSkillLevel] = useState('')
  const [roadmap, setRoadmap] = useState<RoadmapDraft | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const promptPlaceholder = useMemo(() => (
    roadmap
      ? (t('roadmap.wantChanges') || 'Ask the AI to adjust the roadmap...')
      : (t('goalModal.goalPlaceholder') || 'Tell the AI what you want to learn or achieve...')
  ), [roadmap, t])

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
          language,
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
  }, [days, language, loading, prompt, roadmap, saving, skillLevel])

  const beginRoadmap = useCallback(async () => {
    if (!roadmap || saving) return

    setSaving(true)
    setError('')

    try {
      const res = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...roadmap, language }),
      })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Failed to create goal')

      onCreated(data.goal)
      router.push(`/goals/${data.goal.id}`)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create goal')
      setSaving(false)
    }
  }, [language, onCreated, roadmap, router, saving])

  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      generateRoadmap()
    }
  }, [generateRoadmap])

  const composer = (
    <div className="w-full">
      {error && <p className="text-rose-300 text-xs mb-2">{error}</p>}
      <div className="glass rounded-2xl p-2 shadow-xl shadow-black/30">
        <textarea
          value={prompt}
          onChange={event => setPrompt(event.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          placeholder={promptPlaceholder}
          className="w-full resize-none bg-transparent px-3 pt-2.5 pb-1.5 text-sm text-white placeholder-white/35 focus:outline-none min-h-[48px] max-h-40"
        />
        <div className="flex items-center justify-between gap-2 pl-1.5 pr-1 pb-0.5">
          <div className="flex items-center gap-1.5">
            {!roadmap && (
              <>
                <div className="flex items-center gap-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.07] transition-colors px-2.5 py-1.5">
                  <CalendarDays size={13} className="text-white/40" />
                  <input
                    type="number"
                    min={1}
                    max={90}
                    value={days}
                    onChange={e => setDays(e.target.value)}
                    placeholder={t('roadmap.days') || "Days"}
                    className="w-12 bg-transparent text-xs text-white placeholder-white/35 focus:outline-none"
                  />
                </div>
                <select
                  value={skillLevel}
                  onChange={e => setSkillLevel(e.target.value)}
                  className="rounded-lg bg-white/[0.04] hover:bg-white/[0.07] transition-colors px-2.5 py-1.5 text-xs text-white/60 focus:outline-none cursor-pointer"
                >
                  <option value="">{t('roadmap.skillLevel') || "Skill level"}</option>
                  {SKILL_LEVELS.map(level => (
                    <option key={level} value={level} className="bg-[#15151a] capitalize">
                      {level === 'beginner' ? (t('goalModal.beginner') || level) : level === 'intermediate' ? (t('goalModal.intermediate') || level) : (t('goalModal.advanced') || level)}
                    </option>
                  ))}
                </select>
              </>
            )}
          </div>
          <button
            onClick={generateRoadmap}
            disabled={loading || saving || !prompt.trim()}
            className="w-9 h-9 rounded-xl bg-orange-500 hover:bg-orange-400 text-black disabled:opacity-40 disabled:hover:bg-orange-500 transition-colors flex items-center justify-center flex-shrink-0"
            aria-label={roadmap ? (t('roadmap.wantChanges') || 'Update roadmap') : (t('goalModal.generateBtn') || 'Generate roadmap')}
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowUp size={17} />}
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <section className="min-h-[calc(100vh-90px)]">
      <div className="max-w-3xl mx-auto px-4 sm:px-8 py-10">
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
                {t('roadmap.begin') || 'Begin'}
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
                    {t('roadmap.dayByDayPlan') || 'Day-by-day plan'}
                  </div>
                  <span className="text-[11px] text-white/40">{t('roadmap.daysCount', { count: roadmap.days.length }) || `${roadmap.days.length} days`}</span>
                </div>
                <div className="space-y-1.5 max-h-80 overflow-y-auto chat-scroll pr-1">
                  {roadmap.days
                    .slice()
                    .sort((a, b) => a.day - b.day)
                    .map(d => (
                      <div key={d.day} className="flex items-start gap-3 rounded-lg px-2 py-1.5 hover:bg-white/[0.04] transition-colors">
                        <span className="text-[11px] font-semibold text-cyan-200/80 bg-cyan-400/10 rounded-md px-2 py-0.5 flex-shrink-0 mt-0.5">
                          {t('dayLearning.day') || 'Day'} {d.day}
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
                  {t('roadmap.graaNote') || "Graa's note"}
                </div>
                <p className="text-white/58 text-sm leading-relaxed">{roadmap.advice}</p>
              </div>
              <div className="glass rounded-xl p-5">
                <div className="flex items-center gap-2 text-sm font-semibold mb-3">
                  <BookOpen size={16} className="text-emerald-300" />
                  {t('roadmap.resources') || 'Resources'}
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

            {/* Adjust composer */}
            <div className="pt-2">
              <p className="eyebrow text-white/35 mb-2">{t('roadmap.wantChanges') || 'Want changes? Just ask'}</p>
              {composer}
            </div>
          </div>
        ) : (
          <div className="min-h-[calc(100vh-180px)] flex flex-col items-center justify-center text-center">
            <h1 className="text-4xl sm:text-6xl font-semibold tracking-tight text-balance">{t('roadmap.whatToBuild') || 'What should we build toward?'}</h1>
            <p className="text-white/50 mt-5 max-w-xl text-sm sm:text-base leading-relaxed">
              {t('roadmap.whatToBuildDesc') || 'Describe the outcome you want, your current level, and any deadline — Graa shapes it into a day-by-day roadmap before anything is saved.'}
            </p>
            <div className="w-full max-w-2xl mt-9">
              {composer}
              <p className="text-[11px] text-white/30 mt-3">{t('roadmap.daysEmptyHint') || 'Leave days empty and Graa picks a sensible length.'}</p>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
