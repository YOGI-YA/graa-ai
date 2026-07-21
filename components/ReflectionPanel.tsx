'use client'
import { useCallback, useState } from 'react'
import { Loader2, CheckCircle2, BookOpenCheck } from 'lucide-react'

export default function ReflectionPanel({
  goalId,
  day,
  task,
  onSolved,
}: {
  goalId: string
  day: number
  task: { reflectionPrompt: string }
  onSolved?: () => void
}) {
  const [done, setDone] = useState(false)
  const [saving, setSaving] = useState(false)
  const [note, setNote] = useState('')

  const complete = useCallback(async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/goals/${goalId}/day/${day}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: true }),
      })
      if (res.ok) { setDone(true); onSolved?.() }
    } finally {
      setSaving(false)
    }
  }, [goalId, day, onSolved])

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-white/[0.03] border border-white/8 p-4 flex gap-3">
        <BookOpenCheck size={18} className="text-orange-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-white/70 text-sm">No build needed today — this is a review &amp; reflection day. Make sure the ideas above are clear before you move on.</p>
          {task.reflectionPrompt && (
            <p className="text-white/85 text-sm mt-2"><span className="text-orange-300 font-medium">Reflect:</span> {task.reflectionPrompt}</p>
          )}
        </div>
      </div>

      {task.reflectionPrompt && (
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          rows={4}
          placeholder="Jot a quick note for yourself (optional)…"
          className="field px-3.5 py-3 text-sm leading-relaxed resize-y min-h-[90px]"
        />
      )}

      <button onClick={complete} disabled={saving || done} className="btn-primary px-5 py-2.5 text-sm flex items-center gap-2">
        {saving ? <Loader2 size={15} className="animate-spin" /> : done ? <CheckCircle2 size={15} /> : null}
        {done ? 'Completed' : 'Mark reviewed & continue'}
      </button>
    </div>
  )
}
