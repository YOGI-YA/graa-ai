'use client'
import { useEffect, useState } from 'react'
import { Loader2, Wrench, ListChecks, Terminal } from 'lucide-react'
import CodePlayground from '@/components/CodePlayground'
import SubmissionPanel from '@/components/SubmissionPanel'
import ReflectionPanel from '@/components/ReflectionPanel'

type PracticeMode = 'code' | 'submit' | 'reflect'

interface PracticeTask {
  mode: PracticeMode
  title: string
  language: string
  instructions: string
  steps: string[]
  starterCode: string
  checklist: string[]
  hints: string[]
  deliverable: string
  reflectionPrompt: string
}

const RUNNABLE = new Set(['javascript', 'typescript', 'python', 'java', 'cpp', 'c', 'go', 'rust', 'ruby', 'php', 'csharp'])

export default function PracticeSandbox({
  goalId,
  day,
  onSolved,
}: {
  goalId: string
  day: number
  onSolved?: () => void
}) {
  const [task, setTask] = useState<PracticeTask | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError('')
    fetch(`/api/goals/${goalId}/day/${day}/practice`, { signal: controller.signal })
      .then(async res => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to load practice')
        const t = data.task
        const lang = (t.language ?? 'none').toLowerCase()
        const mode: PracticeMode = t.mode ?? (RUNNABLE.has(lang) ? 'code' : 'submit')
        setTask({ ...t, mode, language: lang, hints: t.hints ?? [], deliverable: t.deliverable ?? '', reflectionPrompt: t.reflectionPrompt ?? '' })
      })
      .catch(err => {
        if (!(err instanceof DOMException && err.name === 'AbortError')) {
          setError(err instanceof Error ? err.message : 'Failed to load practice')
        }
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [goalId, day])

  const mode: PracticeMode = task ? (task.mode === 'code' && !RUNNABLE.has(task.language.toLowerCase()) ? 'submit' : task.mode) : 'submit'

  return (
    <section className="glass rounded-2xl p-5 sm:p-6">
      <div className="flex items-center gap-2 text-sm font-semibold mb-4">
        <Wrench size={16} className="text-orange-400" />
        Practice
      </div>

      {loading && (
        <div className="text-center py-6">
          <Loader2 size={24} className="animate-spin text-orange-400 mx-auto mb-3" />
          <p className="text-white/50 text-sm">Designing today&apos;s hands-on task…</p>
        </div>
      )}

      {error && !loading && <p className="text-rose-300 text-sm">{error}</p>}

      {!loading && task && (
        <div className="space-y-5">
          <div>
            <h3 className="font-semibold text-base mb-1.5">{task.title}</h3>
            <p className="text-white/60 text-sm leading-relaxed">{task.instructions}</p>
          </div>

          {task.steps.length > 0 && (
            <div>
              <div className="flex items-center gap-2 eyebrow text-orange-400 mb-2"><Terminal size={14} /> Steps</div>
              <ol className="space-y-1.5">
                {task.steps.map((s, i) => (
                  <li key={i} className="text-white/60 text-sm flex gap-2">
                    <span className="text-orange-400 font-semibold flex-shrink-0">{i + 1}.</span>{s}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {mode === 'code' ? (
            <CodePlayground goalId={goalId} day={day} task={task} onSolved={onSolved} />
          ) : mode === 'reflect' ? (
            <ReflectionPanel goalId={goalId} day={day} task={task} onSolved={onSolved} />
          ) : (
            <SubmissionPanel goalId={goalId} day={day} task={task} onSolved={onSolved} />
          )}

          {task.checklist.length > 0 && (
            <div className="bg-emerald-400/[0.05] border border-emerald-300/15 rounded-xl p-4">
              <div className="flex items-center gap-2 eyebrow text-emerald-300 mb-2"><ListChecks size={14} /> Done when</div>
              <ul className="space-y-1.5">
                {task.checklist.map((c, i) => (
                  <li key={i} className="text-white/60 text-sm flex gap-2"><span className="text-emerald-400 flex-shrink-0">✓</span>{c}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
