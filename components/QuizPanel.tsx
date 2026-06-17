'use client'
import { useCallback, useState } from 'react'
import { GraduationCap, Loader2, CheckCircle2, XCircle, RotateCcw, Trophy } from 'lucide-react'

interface QuizQuestion { question: string; options: string[] }
interface QuestionResult { chosen: number; correct: boolean; answerIndex: number; explanation: string }
interface GradeResult { score: number; total: number; passed: boolean; passRatio: number; results: QuestionResult[] }

type Phase = 'intro' | 'taking' | 'result'

export default function QuizPanel({
  goalId,
  day,
  onPassed,
  lastAttempt = null,
}: {
  goalId: string
  day: number
  onPassed?: () => void
  lastAttempt?: { score: number; total: number; passed: boolean } | null
}) {
  const [phase, setPhase] = useState<Phase>('intro')
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [answers, setAnswers] = useState<number[]>([])
  const [result, setResult] = useState<GradeResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const startQuiz = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/goals/${goalId}/day/${day}/quiz`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load quiz')
      setQuestions(data.questions)
      setAnswers(new Array(data.questions.length).fill(-1))
      setResult(null)
      setPhase('taking')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load quiz')
    } finally {
      setLoading(false)
    }
  }, [goalId, day])

  const submit = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/goals/${goalId}/day/${day}/quiz`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to submit')
      setResult(data)
      setPhase('result')
      if (data.passed) onPassed?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit')
    } finally {
      setLoading(false)
    }
  }, [answers, day, goalId, onPassed])

  const allAnswered = answers.length > 0 && answers.every(a => a >= 0)

  return (
    <section className="glass rounded-2xl p-5 sm:p-6">
      <div className="flex items-center gap-2 text-sm font-semibold mb-4">
        <GraduationCap size={16} className="text-purple-300" />
        Knowledge check
      </div>

      {error && <p className="text-red-300 text-xs mb-3">{error}</p>}

      {phase === 'intro' && (
        <div className="text-center py-4">
          {lastAttempt && (
            <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs mb-3 ${
              lastAttempt.passed ? 'bg-emerald-400/10 text-emerald-200 border border-emerald-300/20' : 'bg-amber-400/10 text-amber-200 border border-amber-300/20'
            }`}>
              {lastAttempt.passed ? <CheckCircle2 size={13} /> : <RotateCcw size={13} />}
              Last attempt: {lastAttempt.score}/{lastAttempt.total} ({Math.round((lastAttempt.score / lastAttempt.total) * 100)}%) — {lastAttempt.passed ? 'passed' : 'try again'}
            </div>
          )}
          <p className="text-white/55 text-sm mb-4">Take a short quiz to lock in what you learned. Score 70% or higher to pass.</p>
          <button
            onClick={startQuiz}
            disabled={loading}
            className="bg-purple-500 hover:bg-purple-400 disabled:opacity-60 text-white rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors inline-flex items-center gap-2"
          >
            {loading ? <><Loader2 size={16} className="animate-spin" /> Preparing quiz…</> : 'Start quiz'}
          </button>
        </div>
      )}

      {phase === 'taking' && (
        <div className="space-y-5">
          {questions.map((q, qi) => (
            <div key={qi}>
              <p className="text-sm font-medium mb-2">{qi + 1}. {q.question}</p>
              <div className="space-y-1.5">
                {q.options.map((opt, oi) => (
                  <label
                    key={oi}
                    className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 text-sm cursor-pointer transition-colors ${
                      answers[qi] === oi
                        ? 'border-purple-400/60 bg-purple-400/10 text-white'
                        : 'border-white/8 hover:border-white/20 text-white/70'
                    }`}
                  >
                    <input
                      type="radio"
                      name={`q-${qi}`}
                      checked={answers[qi] === oi}
                      onChange={() => setAnswers(prev => prev.map((a, i) => (i === qi ? oi : a)))}
                      className="accent-purple-400"
                    />
                    {opt}
                  </label>
                ))}
              </div>
            </div>
          ))}
          <button
            onClick={submit}
            disabled={loading || !allAnswered}
            className="bg-purple-500 hover:bg-purple-400 disabled:opacity-50 text-white rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors inline-flex items-center gap-2"
          >
            {loading ? <><Loader2 size={16} className="animate-spin" /> Grading…</> : allAnswered ? 'Submit answers' : 'Answer all questions'}
          </button>
        </div>
      )}

      {phase === 'result' && result && (
        <div className="space-y-5">
          <div className={`rounded-xl p-4 flex items-center gap-3 ${
            result.passed ? 'bg-emerald-400/10 border border-emerald-300/25' : 'bg-amber-400/10 border border-amber-300/25'
          }`}>
            {result.passed ? <Trophy size={22} className="text-emerald-300" /> : <RotateCcw size={22} className="text-amber-300" />}
            <div>
              <div className="font-semibold text-sm">
                {result.passed ? 'Passed!' : 'Almost there'} — {result.score}/{result.total} ({Math.round((result.score / result.total) * 100)}%)
              </div>
              <div className="text-white/50 text-xs mt-0.5">
                {result.passed ? 'Practice for this day is unlocked below.' : `You need ${Math.round(result.passRatio * 100)}% to pass. Review and try again.`}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {questions.map((q, qi) => {
              const r = result.results[qi]
              return (
                <div key={qi} className="rounded-xl border border-white/8 p-3">
                  <div className="flex items-start gap-2">
                    {r.correct ? <CheckCircle2 size={15} className="text-emerald-400 mt-0.5 flex-shrink-0" /> : <XCircle size={15} className="text-red-400 mt-0.5 flex-shrink-0" />}
                    <p className="text-sm font-medium">{qi + 1}. {q.question}</p>
                  </div>
                  <div className="mt-2 ml-6 text-xs space-y-1">
                    {!r.correct && r.chosen >= 0 && (
                      <p className="text-red-300/80">Your answer: {q.options[r.chosen]}</p>
                    )}
                    <p className="text-emerald-300/80">Correct: {q.options[r.answerIndex]}</p>
                    {r.explanation && <p className="text-white/45">{r.explanation}</p>}
                  </div>
                </div>
              )
            })}
          </div>

          <button
            onClick={startQuiz}
            disabled={loading}
            className="bg-white/8 hover:bg-white/12 border border-white/10 text-white rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors inline-flex items-center gap-2"
          >
            <RotateCcw size={15} /> Retake quiz
          </button>
        </div>
      )}
    </section>
  )
}
