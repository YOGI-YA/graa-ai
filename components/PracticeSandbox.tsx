'use client'
import { useEffect, useState } from 'react'
import { Loader2, Wrench, ListChecks, Terminal, ExternalLink } from 'lucide-react'
import CodePlayground from '@/components/CodePlayground'

interface PracticeTask {
  title: string
  language: string
  instructions: string
  steps: string[]
  starterCode: string
  checklist: string[]
  hints: string[]
}

const RUNNABLE = new Set(['javascript', 'typescript', 'python', 'java', 'cpp', 'c', 'go', 'rust', 'ruby', 'php', 'csharp'])

const EXTERNAL: Record<string, { name: string; url: string }> = {
  html: { name: 'CodePen', url: 'https://codepen.io/pen/' },
  css: { name: 'CodePen', url: 'https://codepen.io/pen/' },
  sql: { name: 'SQLite Playground', url: 'https://sqliteonline.com/' },
}

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
        setTask({ ...data.task, hints: data.task.hints ?? [] })
      })
      .catch(err => {
        if (!(err instanceof DOMException && err.name === 'AbortError')) {
          setError(err instanceof Error ? err.message : 'Failed to load practice')
        }
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [goalId, day])

  const runnable = task ? RUNNABLE.has(task.language.toLowerCase()) : false
  const external = task ? EXTERNAL[task.language.toLowerCase()] : undefined

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

          {runnable ? (
            <CodePlayground goalId={goalId} day={day} task={task} onSolved={onSolved} />
          ) : (
            <div className="rounded-xl bg-white/[0.03] border border-white/8 p-4 text-sm text-white/55">
              This task is best done in your own environment{task.language !== 'none' ? ` (${task.language})` : ''}.
              {external && (
                <> Try a free editor:{' '}
                  <a href={external.url} target="_blank" rel="noopener noreferrer" className="text-orange-300 hover:text-orange-200 inline-flex items-center gap-1">
                    {external.name} <ExternalLink size={12} />
                  </a>
                </>
              )}
              {task.starterCode && (
                <pre className="mt-3 bg-black/40 rounded-lg p-3 text-xs mono text-white/70 overflow-x-auto whitespace-pre-wrap">{task.starterCode}</pre>
              )}
            </div>
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
