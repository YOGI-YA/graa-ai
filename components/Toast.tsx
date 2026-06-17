'use client'
import { useEffect, useState } from 'react'
import { CheckCircle2, XCircle, Info, X, AlertTriangle } from 'lucide-react'

/* ============================ Toasts ============================ */

export type ToastType = 'success' | 'error' | 'info'

export function notify(message: string, type: ToastType = 'info') {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('graa:toast', { detail: { message, type } }))
  }
}

interface ToastItem { id: number; message: string; type: ToastType }

const TOAST_STYLE: Record<ToastType, { icon: typeof Info; color: string }> = {
  success: { icon: CheckCircle2, color: 'text-emerald-400' },
  error: { icon: XCircle, color: 'text-rose-400' },
  info: { icon: Info, color: 'text-orange-400' },
}

export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([])

  useEffect(() => {
    let n = 0
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { message: string; type: ToastType }
      const id = ++n
      setItems(prev => [...prev, { id, ...detail }])
      setTimeout(() => setItems(prev => prev.filter(i => i.id !== id)), 4200)
    }
    window.addEventListener('graa:toast', handler)
    return () => window.removeEventListener('graa:toast', handler)
  }, [])

  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 items-center w-full max-w-sm px-4 pointer-events-none">
      {items.map(t => {
        const { icon: Icon, color } = TOAST_STYLE[t.type]
        return (
          <div key={t.id} className="glass-strong rounded-xl px-4 py-3 w-full flex items-start gap-2.5 scale-in shadow-2xl pointer-events-auto">
            <Icon size={17} className={`${color} flex-shrink-0 mt-0.5`} />
            <p className="text-sm text-white/85 flex-1 leading-snug">{t.message}</p>
            <button onClick={() => setItems(prev => prev.filter(i => i.id !== t.id))} className="text-white/30 hover:text-white transition-colors">
              <X size={15} />
            </button>
          </div>
        )
      })}
    </div>
  )
}

/* ========================= Confirm dialog ========================= */

interface ConfirmOpts {
  title: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
}

export function confirmDialog(opts: ConfirmOpts): Promise<boolean> {
  return new Promise(resolve => {
    if (typeof window === 'undefined') return resolve(false)
    window.dispatchEvent(new CustomEvent('graa:confirm', { detail: { opts, resolve } }))
  })
}

export function ConfirmHost() {
  const [state, setState] = useState<{ opts: ConfirmOpts; resolve: (v: boolean) => void } | null>(null)

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { opts: ConfirmOpts; resolve: (v: boolean) => void }
      setState(prev => { prev?.resolve(false); return detail })
    }
    window.addEventListener('graa:confirm', handler)
    return () => window.removeEventListener('graa:confirm', handler)
  }, [])

  if (!state) return null
  const { opts, resolve } = state
  const close = (v: boolean) => { resolve(v); setState(null) }

  return (
    <div className="fixed inset-0 z-[110] bg-black/65 flex items-center justify-center p-4" onClick={() => close(false)}>
      <div className="glass-strong scale-in rounded-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-start gap-3">
          {opts.danger && (
            <span className="w-9 h-9 rounded-xl bg-rose-500/15 flex items-center justify-center flex-shrink-0">
              <AlertTriangle size={17} className="text-rose-400" />
            </span>
          )}
          <div>
            <h3 className="font-semibold">{opts.title}</h3>
            {opts.message && <p className="text-white/55 text-sm mt-1.5 leading-relaxed">{opts.message}</p>}
          </div>
        </div>
        <div className="flex items-center justify-end gap-2.5 mt-6">
          <button onClick={() => close(false)} className="btn-ghost px-4 py-2 text-sm">
            {opts.cancelLabel || 'Cancel'}
          </button>
          <button
            onClick={() => close(true)}
            className={`px-4 py-2 text-sm font-semibold rounded-full transition-all ${
              opts.danger
                ? 'bg-rose-500 hover:bg-rose-400 text-white'
                : 'btn-primary'
            }`}
          >
            {opts.confirmLabel || 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  )
}
