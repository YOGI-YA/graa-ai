import Link from 'next/link'
import { Check } from 'lucide-react'
import Logo from '@/components/Logo'

const BULLETS = [
  'Day-by-day roadmaps for any goal',
  'Curated lessons, quizzes & real practice',
  'An AI mentor that knows your curriculum',
]

// Compact split-screen auth: tight form on the left, brand showcase on the right.
export default function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Form side */}
      <div className="flex items-center justify-center px-5 py-10 sm:px-8">
        <div className="w-full max-w-sm fade-up">
          <Link href="/" className="inline-flex mb-8">
            <Logo size={32} />
          </Link>
          <h1 className="display text-3xl sm:text-4xl text-white">{title}</h1>
          <p className="text-white/50 text-sm mt-2 mb-7">{subtitle}</p>
          {children}
        </div>
      </div>

      {/* Showcase side */}
      <div className="hidden lg:flex relative border-l border-white/8 overflow-hidden items-center justify-center p-12">
        <div className="absolute inset-0 pointer-events-none"
             style={{ background: 'radial-gradient(50% 50% at 70% 20%, rgba(255,106,0,0.12), transparent 70%)' }} />
        <div className="relative max-w-md">
          <div className="eyebrow text-orange-400 mb-4">Graa AI</div>
          <h2 className="display text-4xl text-white leading-[0.95]">
            Learn anything,<br /><span className="text-orange-500">day by day</span>
          </h2>
          <ul className="mt-8 space-y-3.5">
            {BULLETS.map(b => (
              <li key={b} className="flex items-center gap-3 text-white/75 text-sm">
                <span className="w-5 h-5 rounded-full bg-orange-500/15 flex items-center justify-center flex-shrink-0">
                  <Check size={12} className="text-orange-400" />
                </span>
                {b}
              </li>
            ))}
          </ul>

          {/* mini terminal mock */}
          <div className="glass-strong rounded-2xl overflow-hidden mt-10">
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/8">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
              <span className="ml-2 mono text-[11px] text-white/35">graa</span>
            </div>
            <div className="p-4 mono text-[12px] leading-relaxed">
              <p className="text-white/50"><span className="text-orange-400">$</span> graa new <span className="text-emerald-300">&quot;Learn SQL in 14 days&quot;</span></p>
              <p className="text-white/40 mt-1.5">✓ roadmap ready · 14 days</p>
              <p className="text-white/70 mt-1"><span className="text-orange-500">01</span>  SELECT &amp; filtering basics</p>
              <p className="text-white/70"><span className="text-orange-500">02</span>  JOINs across tables</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
