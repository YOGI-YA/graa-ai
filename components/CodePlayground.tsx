'use client'
import { useCallback, useState } from 'react'
import Editor from '@monaco-editor/react'
import { Play, Loader2, Lightbulb, Send, CheckCircle2, RotateCcw, Terminal } from 'lucide-react'

interface Lang { id: string; label: string; monaco: string; piston: string }

const LANGS: Lang[] = [
  { id: 'javascript', label: 'JavaScript', monaco: 'javascript', piston: 'javascript' },
  { id: 'typescript', label: 'TypeScript', monaco: 'typescript', piston: 'typescript' },
  { id: 'python', label: 'Python', monaco: 'python', piston: 'python' },
  { id: 'java', label: 'Java', monaco: 'java', piston: 'java' },
  { id: 'cpp', label: 'C++', monaco: 'cpp', piston: 'c++' },
  { id: 'c', label: 'C', monaco: 'c', piston: 'c' },
  { id: 'go', label: 'Go', monaco: 'go', piston: 'go' },
  { id: 'rust', label: 'Rust', monaco: 'rust', piston: 'rust' },
  { id: 'ruby', label: 'Ruby', monaco: 'ruby', piston: 'ruby' },
  { id: 'php', label: 'PHP', monaco: 'php', piston: 'php' },
  { id: 'csharp', label: 'C#', monaco: 'csharp', piston: 'csharp' },
]

function resolveLang(id: string): Lang {
  const norm = id.toLowerCase()
  return LANGS.find(l => l.id === norm || l.monaco === norm) || LANGS.find(l => l.id === 'javascript')!
}

export default function CodePlayground({
  goalId,
  day,
  task,
  onSolved,
}: {
  goalId: string
  day: number
  task: { title: string; language: string; starterCode: string; hints: string[] }
  onSolved?: () => void
}) {
  const [lang, setLang] = useState<Lang>(() => resolveLang(task.language))
  const [code, setCode] = useState(task.starterCode || '')
  const [output, setOutput] = useState<string | null>(null)
  const [running, setRunning] = useState(false)
  const [hintsShown, setHintsShown] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{ passed: boolean; feedback: string } | null>(null)

  const run = useCallback(async () => {
    setRunning(true)
    setOutput(null)
    try {
      const res = await fetch('/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: lang.piston, source: code }),
      })
      const data = await res.json()
      setOutput(res.ok ? data.output : (data.error || 'Run failed'))
    } catch {
      setOutput('Could not reach the code runner.')
    } finally {
      setRunning(false)
    }
  }, [code, lang])

  const submit = useCallback(async () => {
    setSubmitting(true)
    setResult(null)
    try {
      const res = await fetch(`/api/goals/${goalId}/day/${day}/practice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, language: lang.id }),
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
  }, [code, day, goalId, lang, onSolved])

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <select
          value={lang.id}
          onChange={e => setLang(resolveLang(e.target.value))}
          className="bg-white/5 border border-white/12 rounded-lg px-2.5 py-1.5 text-xs text-white/80 focus:outline-none focus:border-orange-400/50"
        >
          {LANGS.map(l => <option key={l.id} value={l.id} className="bg-[#15151a]">{l.label}</option>)}
        </select>
        <button
          onClick={run}
          disabled={running}
          className="btn-primary px-4 py-1.5 text-xs flex items-center gap-1.5"
        >
          {running ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />}
          Run
        </button>
        <button
          onClick={() => setCode(task.starterCode || '')}
          className="btn-ghost px-3 py-1.5 text-xs flex items-center gap-1.5"
        >
          <RotateCcw size={13} /> Reset
        </button>
      </div>

      {/* Editor */}
      <div className="rounded-xl overflow-hidden border border-white/10">
        <Editor
          height="340px"
          language={lang.monaco}
          theme="vs-dark"
          value={code}
          onChange={v => setCode(v ?? '')}
          loading={<div className="h-[340px] flex items-center justify-center"><Loader2 size={20} className="animate-spin text-white/40" /></div>}
          options={{
            fontSize: 13,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            padding: { top: 12, bottom: 12 },
            fontFamily: 'var(--font-mono), monospace',
            tabSize: 2,
            automaticLayout: true,
          }}
        />
      </div>

      {/* Output */}
      {output !== null && (
        <div className="rounded-xl border border-white/10 bg-black/50 overflow-hidden">
          <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-white/8 text-[11px] text-white/40">
            <Terminal size={12} /> Output
          </div>
          <pre className="p-3 text-[12px] mono text-white/80 whitespace-pre-wrap max-h-56 overflow-auto">{output}</pre>
        </div>
      )}

      {/* Hints */}
      {task.hints.length > 0 && (
        <div className="rounded-xl border border-white/8 bg-amber-400/[0.04] p-3">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-300"><Lightbulb size={14} /> Hints</span>
            {hintsShown < task.hints.length && (
              <button onClick={() => setHintsShown(n => n + 1)} className="text-xs text-amber-300/80 hover:text-amber-200">
                {hintsShown === 0 ? 'Show a hint' : 'Next hint'} ({hintsShown}/{task.hints.length})
              </button>
            )}
          </div>
          {hintsShown > 0 && (
            <ol className="mt-2 space-y-1.5">
              {task.hints.slice(0, hintsShown).map((h, i) => (
                <li key={i} className="text-sm text-white/65 flex gap-2">
                  <span className="text-amber-400/70 font-semibold">{i + 1}.</span>{h}
                </li>
              ))}
            </ol>
          )}
        </div>
      )}

      {/* Submit */}
      <div className="flex items-center gap-3">
        <button onClick={submit} disabled={submitting} className="btn-primary px-5 py-2.5 text-sm flex items-center gap-2">
          {submitting ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
          Submit for review
        </button>
        {result && (
          <span className={`text-sm flex items-center gap-1.5 ${result.passed ? 'text-emerald-300' : 'text-amber-300'}`}>
            {result.passed && <CheckCircle2 size={15} />}
            {result.passed ? 'Passed!' : 'Keep going'}
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
