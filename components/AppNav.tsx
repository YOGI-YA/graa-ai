'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { useEffect, useRef, useState } from 'react'
import { LayoutDashboard, Target, User, Plus, LogOut } from 'lucide-react'
import Logo from '@/components/Logo'

interface AppNavProps {
  firstName?: string
  onNewGoal?: () => void
}

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, match: (p: string) => p === '/dashboard' },
  { href: '/goals', label: 'Goals', icon: Target, match: (p: string) => p === '/goals' || p.startsWith('/goals/') },
]

export default function AppNav({ firstName, onNewGoal }: AppNavProps) {
  const pathname = usePathname()
  const initial = (firstName?.trim()?.[0] || '').toUpperCase()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [menuOpen])

  return (
    <header className="sticky top-0 z-40 px-3 sm:px-4 pt-3 sm:pt-4">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-3 glass rounded-2xl px-3 sm:px-4 py-2.5">
        <Link href="/dashboard" aria-label="Home">
          <Logo size={30} />
        </Link>

        <nav className="flex items-center gap-1 bg-white/[0.04] border border-white/8 rounded-xl p-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon, match }) => {
            const active = match(pathname)
            return (
              <Link
                key={label}
                href={href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all ${
                  active
                    ? 'bg-orange-500/15 text-orange-200 border border-orange-400/20'
                    : 'text-white/55 hover:text-white hover:bg-white/6 border border-transparent'
                }`}
              >
                <Icon size={14} />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="flex items-center gap-2">
          {onNewGoal && (
            <button onClick={onNewGoal} className="btn-primary hidden sm:flex px-3 py-1.5 text-xs items-center gap-1.5">
              <Plus size={14} />
              New
            </button>
          )}

          {/* Account menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(o => !o)}
              aria-label="Account menu"
              aria-expanded={menuOpen}
              className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center text-xs font-bold text-[#120a02] shadow-lg shadow-orange-500/30 hover:scale-105 transition-transform"
            >
              {initial || <User size={14} />}
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-2 w-44 glass-strong rounded-xl p-1.5 scale-in origin-top-right z-50">
                {firstName && (
                  <div className="px-3 py-2 text-xs text-white/45 border-b border-white/8 mb-1">
                    Signed in as <span className="text-white/80">{firstName}</span>
                  </div>
                )}
                <Link
                  href="/profile"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-white/75 hover:bg-white/8 hover:text-white transition-colors"
                >
                  <User size={15} /> Profile
                </Link>
                <button
                  onClick={() => signOut({ callbackUrl: '/' })}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-red-200/90 hover:bg-red-500/10 transition-colors"
                >
                  <LogOut size={15} /> Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
