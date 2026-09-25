'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { X, Loader2, Brain, Sparkles, Globe } from 'lucide-react'
import type { Goal } from '@/types/goal'
import { useTranslation } from '@/lib/LanguageContext'
import { INDIAN_LANGUAGES } from '@/lib/languages'

const CATEGORIES = ['Programming', 'Data Science', 'Design', 'Language', 'Business', 'Mathematics', 'Science', 'Arts', 'Health', 'Other']
const SKILL_LEVELS = ['beginner', 'intermediate', 'advanced']

export default function NewGoalModal({ onClose, onCreated }: { onClose: () => void; onCreated: (goal: Goal) => void }) {
  const { t, language } = useTranslation()
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'Programming',
    targetDate: '',
    durationDays: '',
    skillLevel: '',
    language: language || 'en',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [advice, setAdvice] = useState('')
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
  }, [])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Failed to create goal')

      setAdvice(data.advice)
      closeTimerRef.current = setTimeout(() => onCreated(data.goal), 1200)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create goal')
      setLoading(false)
    }
  }, [form, loading, onCreated])

  return (
    <div className="fixed inset-0 bg-black/65 flex items-center justify-center p-4 z-50">
      <div className="glass-strong scale-in rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-orange-500/10 rounded-lg flex items-center justify-center">
              <Sparkles size={15} className="text-orange-400" />
            </div>
            <div>
              <h2 className="font-semibold text-sm">{t('goalModal.title')}</h2>
              <p className="text-white/40 text-xs">{t('goalModal.subtitle')}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {advice ? (
          <div className="p-6 text-center">
            <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Brain size={24} className="text-emerald-400" />
            </div>
            <h3 className="font-semibold mb-3">Goal Created!</h3>
            <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4 text-sm text-orange-200 leading-relaxed text-left mb-3">
              <p className="text-xs text-orange-400 font-medium mb-1.5">Graa says:</p>
              {advice}
            </div>
            <p className="text-white/40 text-xs">Redirecting to your dashboard...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-xs text-white/60 mb-1.5 font-medium">{t('goalModal.goalLabel')}</label>
              <input
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/25 focus:outline-none focus:border-orange-500 transition-colors text-sm"
                placeholder={t('goalModal.goalPlaceholder')}
                required
              />
            </div>
            <div>
              <label className="block text-xs text-white/60 mb-1.5 font-medium">{t('goals.subtitle') || 'Description'}</label>
              <textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={3}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/25 focus:outline-none focus:border-orange-500 transition-colors text-sm resize-none"
                placeholder="Describe what you want to achieve. The more detail, the better your AI roadmap."
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-white/60 mb-1.5 font-medium">Category</label>
                <select
                  value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-orange-500 transition-colors text-sm"
                >
                  {CATEGORIES.map(c => <option key={c} value={c} className="bg-gray-900">{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-white/60 mb-1.5 font-medium">{t('goalModal.skillLabel')}</label>
                <select
                  value={form.skillLevel}
                  onChange={e => setForm(f => ({ ...f, skillLevel: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-orange-500 transition-colors text-sm capitalize"
                >
                  <option value="" className="bg-gray-900">Auto-detect</option>
                  {SKILL_LEVELS.map(level => (
                    <option key={level} value={level} className="bg-gray-900 capitalize">
                      {level === 'beginner' ? t('goalModal.beginner') : level === 'intermediate' ? t('goalModal.intermediate') : t('goalModal.advanced')}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Language Selection for Roadmap */}
            <div>
              <label className="block text-xs text-white/60 mb-1.5 font-medium flex items-center gap-1.5">
                <Globe size={13} className="text-orange-400" />
                {t('goalModal.languageLabel')}
              </label>
              <select
                value={form.language}
                onChange={e => setForm(f => ({ ...f, language: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-orange-500 transition-colors text-sm"
              >
                {INDIAN_LANGUAGES.map(l => (
                  <option key={l.code} value={l.code} className="bg-gray-900">
                    {l.nativeName} ({l.name}) {l.popular ? '★' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-white/60 mb-1.5 font-medium">{t('goalModal.daysLabel')}</label>
                <input
                  type="number"
                  min={1}
                  max={90}
                  value={form.durationDays}
                  onChange={e => setForm(f => ({ ...f, durationDays: e.target.value }))}
                  placeholder={t('goalModal.daysPlaceholder')}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/25 focus:outline-none focus:border-orange-500 transition-colors text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-white/60 mb-1.5 font-medium">Target Date (optional)</label>
                <input
                  type="date"
                  value={form.targetDate}
                  onChange={e => setForm(f => ({ ...f, targetDate: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-orange-500 transition-colors text-sm"
                />
              </div>
            </div>

            {error && <p className="text-red-400 text-xs">{error}</p>}
            <div className="bg-orange-500/5 border border-orange-500/15 rounded-xl p-3 text-xs text-orange-300/70 flex items-start gap-2">
              <Brain size={13} className="mt-0.5 flex-shrink-0 text-orange-400" />
              AI will generate a day-by-day plan, milestones, and quizzes tailored to your language.
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-2.5 flex items-center justify-center gap-2 text-sm"
            >
              {loading ? <><Loader2 size={15} className="animate-spin" /> {t('goalModal.generating')}</> : t('goalModal.generateBtn')}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
