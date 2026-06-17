'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Bot } from 'lucide-react'
import ChatPanel from './ChatPanel'
import type { Goal } from '@/types/goal'

const HIDDEN_ON = ['/', '/login', '/register']
const STORAGE_KEY = 'mentorFabPos'

export default function ChatLauncher() {
  const { status } = useSession()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [goals, setGoals] = useState<Goal[]>([])
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
  const drag = useRef({ active: false, startX: 0, startY: 0, dx: 0, dy: 0 })

  // Initialise FAB position (saved or bottom-right).
  useEffect(() => {
    if (pos) return
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) { setPos(JSON.parse(saved)); return }
    } catch {}
    setPos({ x: window.innerWidth - 80, y: window.innerHeight - 96 })
  }, [pos])

  // Keep the FAB on-screen if the window resizes.
  useEffect(() => {
    const onResize = () => setPos(p => p ? {
      x: Math.min(p.x, window.innerWidth - 64),
      y: Math.min(p.y, window.innerHeight - 64),
    } : p)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // Lazy-load goals the first time the panel opens (for goal-scoped RAG chat).
  useEffect(() => {
    if (!open || goals.length > 0) return
    fetch('/api/goals')
      .then(r => (r.ok ? r.json() : []))
      .then(d => { if (Array.isArray(d)) setGoals(d) })
      .catch(() => {})
  }, [open, goals.length])

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    if (!pos) return
    drag.current = { active: true, startX: e.clientX, startY: e.clientY, dx: e.clientX - pos.x, dy: e.clientY - pos.y }
    e.currentTarget.setPointerCapture(e.pointerId)
  }, [pos])

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    if (!drag.current.active) return
    const x = Math.min(window.innerWidth - 64, Math.max(8, e.clientX - drag.current.dx))
    const y = Math.min(window.innerHeight - 64, Math.max(8, e.clientY - drag.current.dy))
    setPos({ x, y })
  }, [])

  const onPointerUp = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    if (!drag.current.active) return
    drag.current.active = false
    const dist = Math.hypot(e.clientX - drag.current.startX, e.clientY - drag.current.startY)
    if (dist < 6) {
      setOpen(o => !o) // treated as a tap, not a drag
    } else {
      setPos(p => { if (p) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)) } catch {} } return p })
    }
  }, [])

  if (status !== 'authenticated' || HIDDEN_ON.includes(pathname)) return null

  return (
    <>
      {pos && !open && (
        <button
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          style={{ left: pos.x, top: pos.y }}
          className="group fixed z-50 w-14 h-14 rounded-2xl touch-none cursor-grab active:cursor-grabbing scale-in
                     bg-gradient-to-br from-indigo-500 via-violet-500 to-cyan-400 text-white
                     shadow-xl shadow-violet-500/40 flex items-center justify-center
                     hover:scale-110 active:scale-95 transition-transform will-change-transform"
          aria-label="Open AI mentor"
        >
          <span className="absolute inset-0 rounded-2xl ring-2 ring-white/30 animate-ping opacity-30 group-hover:opacity-0" />
          <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#0b0d1c]" />
          <Bot size={24} className="relative" />
        </button>
      )}
      {open && <ChatPanel goals={goals} onClose={() => setOpen(false)} />}
    </>
  )
}
