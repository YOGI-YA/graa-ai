'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import sdk from '@stackblitz/sdk'
import { Loader2, Wrench, ListChecks, Terminal, ExternalLink } from 'lucide-react'

interface PracticeTask {
  title: string
  language: string
  instructions: string
  steps: string[]
  starterCode: string
  checklist: string[]
}

// Languages StackBlitz WebContainers can actually run in-browser.
function templateFor(lang: string): { template: 'node' | 'html'; file: string } | null {
  const l = lang.toLowerCase()
  if (['html', 'css'].includes(l)) return { template: 'html', file: 'index.html' }
  if (['javascript', 'js', 'typescript', 'ts', 'node', 'react', 'vue', 'jsx', 'tsx'].includes(l)) {
    return { template: 'node', file: 'index.js' }
  }
  return null
}

// Free online editors for languages StackBlitz can't run.
const EXTERNAL_PLAYGROUNDS: Record<string, { name: string; url: string }> = {
  python: { name: 'Programiz Python', url: 'https://www.programiz.com/python-programming/online-compiler/' },
  sql: { name: 'SQLite Playground', url: 'https://sqliteonline.com/' },
}

export default function PracticeSandbox({ goalId, day }: { goalId: string; day: number }) {
  const [task, setTask] = useState<PracticeTask | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const embedRef = useRef<HTMLDivElement>(null)
  const embedded = useRef(false)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError('')
    fetch(`/api/goals/${goalId}/day/${day}/practice`, { signal: controller.signal })
      .then(async res => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to load practice')
        setTask(data.task)
      })
      .catch(err => {
        if (!(err instanceof DOMException && err.name === 'AbortError')) {
          setError(err instanceof Error ? err.message : 'Failed to load practice')
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [goalId, day])

  const embed = useCallback(() => {
    if (!task || embedded.current || !embedRef.current) return
    const tpl = templateFor(task.language)
    if (!tpl) return

    const files: Record<string, string> =
      tpl.template === 'html'
        ? { 'index.html': task.starterCode || '<!-- Build your solution here -->\n' }
        : {
            'index.js': task.starterCode || '// Build your solution here\n',
            'package.json': JSON.stringify({ name: 'practice', type: 'module', scripts: { start: 'node index.js' } }, null, 2),
          }

    embedded.current = true
    sdk.embedProject(
      embedRef.current,
      {
        title: task.title,
        description: task.instructions,
        template: tpl.template,
        files,
      },
      { height: 480, openFile: tpl.file, view: 'editor', terminalHeight: 35, hideExplorer: false }
    )
  }, [task])

  useEffect(() => {
    embed()
  }, [embed])

  const tpl = task ? templateFor(task.language) : null
  const external = task ? EXTERNAL_PLAYGROUNDS[task.language.toLowerCase()] : undefined

  return (
    <section className="glass rounded-2xl p-5 sm:p-6">
      <div className="flex items-center gap-2 text-sm font-semibold mb-4">
        <Wrench size={16} className="text-cyan-300" />
        Practice
      </div>

      {loading && (
        <div className="text-center py-6">
          <Loader2 size={24} className="animate-spin text-cyan-300 mx-auto mb-3" />
          <p className="text-white/50 text-sm">Designing today&apos;s hands-on task…</p>
        </div>
      )}

      {error && !loading && <p className="text-red-300 text-sm">{error}</p>}

      {!loading && task && (
        <div className="space-y-5">
          <div>
            <h3 className="font-semibold text-base mb-1.5">{task.title}</h3>
            <p className="text-white/60 text-sm leading-relaxed">{task.instructions}</p>
          </div>

          {task.steps.length > 0 && (
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-cyan-200 mb-2">
                <Terminal size={14} /> Steps
              </div>
              <ol className="space-y-1.5">
                {task.steps.map((s, i) => (
                  <li key={i} className="text-white/60 text-sm flex gap-2">
                    <span className="text-cyan-400 font-semibold flex-shrink-0">{i + 1}.</span>
                    {s}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {tpl ? (
            <div className="rounded-xl overflow-hidden border border-white/10">
              <div ref={embedRef} className="w-full" style={{ minHeight: 480 }} />
            </div>
          ) : (
            <div className="rounded-xl bg-white/[0.03] border border-white/8 p-4 text-sm text-white/55">
              This task is best done in your own environment{task.language !== 'none' ? ` (${task.language})` : ''}.
              {external && (
                <>
                  {' '}Try a free online editor:{' '}
                  <a href={external.url} target="_blank" rel="noopener noreferrer" className="text-cyan-300 hover:text-cyan-200 inline-flex items-center gap-1">
                    {external.name} <ExternalLink size={12} />
                  </a>
                </>
              )}
              {task.starterCode && (
                <pre className="mt-3 bg-black/40 rounded-lg p-3 text-xs text-white/70 overflow-x-auto whitespace-pre-wrap">{task.starterCode}</pre>
              )}
            </div>
          )}

          {task.checklist.length > 0 && (
            <div className="bg-emerald-400/[0.05] border border-emerald-300/15 rounded-xl p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-200 mb-2">
                <ListChecks size={14} /> Done when
              </div>
              <ul className="space-y-1.5">
                {task.checklist.map((c, i) => (
                  <li key={i} className="text-white/60 text-sm flex gap-2">
                    <span className="text-emerald-400 flex-shrink-0">✓</span>
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
