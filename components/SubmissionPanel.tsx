'use client'
import { useCallback, useState } from 'react'
import { Loader2, Lightbulb, Send, CheckCircle2, Link as LinkIcon } from 'lucide-react'
import { useTranslation } from '@/lib/LanguageContext'

export default function SubmissionPanel({
  goalId,
  day,
  task,
  onSolved,
}: {
  goalId: string
  day: number
  task: { title: string; deliverable: string; hints: string[] }
  onSolved?: () => void
}) {
  const { t } = useTranslation()
  const [answer, setAnswer] = useState('')
  const [link, setLink] = useState('')
  const [hintsShown, setHintsShown] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{ passed: boolean; feedback: string } | null>(null)

  const submit = useCallback(async () => {
    if (!answer.trim() && !link.trim()) return
    setSubmitting(true)
    setResult(null)
    const submission = [answer.trim(), link.trim() ? `Link: ${link.trim()}` : ''].filter(Boolean).join('\n\n')
    try {
      const res = await fetch(`/api/goals/${goalId}/day/${day}/practice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submission }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      setResult(data)
      if (data.passed) onSolved?.()
    } catch (e) {
      setResult({ passed: false, feedback: e instanceof Error ? e.message : 'Submission failed.' })
    } finally {
      setSubmitting(false)
    }
  }, [answer, link, day, goalId, onSolved])

  return (
    <div className="space-y-3">
      <div>
        <label className="eyebrow text-white/40 mb-1.5 block">{task.deliverable || t('practice.yourSolution') || 'Your solution'}</label>
        <textarea
          value={answer}
          onChange={e => setAnswer(e.target.value)}
          rows={6}
          placeholder={t('practice.solutionPlaceholder') || "Write your answer, design, approach, or analysis here…"}
          className="field px-3.5 py-3 text-sm leading-relaxed resize-y min-h-[140px]"
        />
      </div>

      <div className="flex items-center gap-2 rounded-lg bg-white/[0.04] px-3 py-2">
        <LinkIcon size={14} className="text-white/40 flex-shrink-0" />
        <input
          value={link}
          onChange={e => setLink(e.target.value)}
          placeholder={t('practice.linkPlaceholder') || "Optional: link to your work (Figma, repo, doc…)"}
          className="flex-1 bg-transparent text-sm text-white placeholder-white/35 focus:outline-none"
        />
      </div>

      {/* Hints */}
      {task.hints.length > 0 && (
        <div className="rounded-xl border border-white/8 bg-amber-400/[0.04] p-3">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-300">
              <Lightbulb size={14} /> {t('practice.suggestions') || 'Suggestions'}
            </span>
            {hintsShown < task.hints.length && (
              <button onClick={() => setHintsShown(n => n + 1)} className="text-xs text-amber-300/80 hover:text-amber-200">
                {hintsShown === 0 ? (t('practice.showSuggestion') || 'Show a suggestion') : (t('practice.nextSuggestion') || 'Next suggestion')} ({hintsShown}/{task.hints.length})
              </button>
            )}
          </div>
          {hintsShown > 0 && (
            <ol className="mt-2 space-y-1.5">
              {task.hints.slice(0, hintsShown).map((h, i) => (
                <li key={i} className="text-sm text-white/65 flex gap-2"><span className="text-amber-400/70 font-semibold">{i + 1}.</span>{h}</li>
              ))}
            </ol>
          )}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={submit}
          disabled={submitting || (!answer.trim() && !link.trim())}
          className="btn-primary px-5 py-2.5 text-sm flex items-center gap-2"
        >
          {submitting ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
          {t('practice.submitReview') || 'Submit for review'}
        </button>
        {result && (
          <span className={`text-sm flex items-center gap-1.5 ${result.passed ? 'text-emerald-300' : 'text-amber-300'}`}>
            {result.passed && <CheckCircle2 size={15} />}
            {result.passed ? (t('practice.passed') || 'Passed!') : (t('practice.keepGoing') || 'Keep going')}
          </span>
        )}
      </div>
      {result && (
        <p className={`text-sm leading-relaxed rounded-xl px-4 py-3 border ${
          result.passed ? 'text-emerald-100/80 bg-emerald-400/[0.06] border-emerald-300/20' : 'text-white/70 bg-white/[0.03] border-white/10'
        }`}>{result.feedback}</p>
      )}
    </div>
  )
}
