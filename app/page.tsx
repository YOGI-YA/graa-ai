import Link from 'next/link'
import {
  Target, MessageSquare, BookOpen, GraduationCap, Wrench, Sparkles, ArrowRight,
  PlayCircle, FileText, Bot, Check,
} from 'lucide-react'
import Logo from '@/components/Logo'

const FEATURES = [
  { icon: Target, title: 'Day-by-day roadmaps', desc: 'Describe a goal. Get a structured plan split into focused daily lessons — the AI even sizes the timeline for you.', color: 'text-orange-400', bg: 'bg-orange-500/12' },
  { icon: BookOpen, title: 'Curated daily content', desc: 'Each day pulls the best video, docs, and a written lesson from across the web. No 400-tab rabbit holes.', color: 'text-blue-400', bg: 'bg-blue-500/12' },
  { icon: GraduationCap, title: 'Quizzes that unlock', desc: 'A short check after every lesson. Pass it to prove you got it — and unlock the day’s hands-on build.', color: 'text-yellow-400', bg: 'bg-yellow-500/12' },
  { icon: Wrench, title: 'Real practice sandbox', desc: 'A live in-browser editor seeded with the day’s task. You actually build — not just read and forget.', color: 'text-emerald-400', bg: 'bg-emerald-500/12' },
  { icon: MessageSquare, title: 'A mentor that knows you', desc: 'Ask Graa anything. It answers grounded in your own curriculum, streaming in real time.', color: 'text-rose-400', bg: 'bg-rose-500/12' },
  { icon: Sparkles, title: 'Adapts to your level', desc: 'Set your pace and skill once. Every roadmap, lesson, and task reshapes itself around how you learn.', color: 'text-orange-400', bg: 'bg-orange-500/12' },
]

const STEPS = [
  { n: '01', title: 'Set a goal', desc: 'Tell Graa what you want to learn and how long you’ve got.' },
  { n: '02', title: 'Learn each day', desc: 'Watch, read, and absorb one focused, curated lesson.' },
  { n: '03', title: 'Test & build', desc: 'Pass the quiz, then ship it in a live sandbox.' },
]

export default function HomePage() {
  return (
    <div className="min-h-screen text-white overflow-x-hidden">
      {/* Nav */}
      <nav className="sticky top-0 z-40">
        <div className="max-w-6xl mx-auto m-3 sm:m-4 px-4 sm:px-6 py-3 flex items-center justify-between glass rounded-2xl">
          <Logo size={30} />
          <div className="hidden md:flex items-center gap-7 text-sm text-white/55">
            <a href="#how" className="hover:text-white transition-colors">How it works</a>
            <a href="#features" className="hover:text-white transition-colors">Features</a>
          </div>
          <div className="flex items-center gap-2.5">
            <Link href="/login" className="btn-outline px-4 py-2 text-sm">Login</Link>
            <Link href="/register" className="btn-primary px-4 py-2 text-sm">Get started</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-10 sm:pt-20 pb-12 grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <div className="inline-flex items-center gap-2 glass rounded-full px-3 py-1 mb-6 fade-up">
            <span className="eyebrow text-orange-400">New</span>
            <span className="text-sm text-white/70">Your goal → a roadmap in seconds</span>
          </div>
          <h1 className="display text-5xl sm:text-7xl text-balance fade-up" style={{ animationDelay: '50ms' }}>
            Learn anything,<br />
            <span className="text-orange-500">day by day</span>
          </h1>
          <p className="text-lg text-white/60 mt-6 max-w-lg leading-relaxed fade-up" style={{ animationDelay: '110ms' }}>
            Graa turns any goal into a day-by-day roadmap with curated lessons, quizzes,
            and hands-on practice. Learning that’s <span className="text-orange-400 font-semibold">focused</span>,{' '}
            <span className="text-blue-400 font-semibold">practical</span> &amp;{' '}
            <span className="text-rose-400 font-semibold">actually finishable</span>.
          </p>
          <div className="flex flex-wrap items-center gap-3 mt-9 fade-up" style={{ animationDelay: '170ms' }}>
            <Link href="/register" className="btn-primary px-7 py-3.5 text-sm inline-flex items-center gap-2 group">
              Start learning — free
              <ArrowRight size={17} className="group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <a href="#how" className="btn-ghost px-7 py-3.5 text-sm">See how it works</a>
          </div>
          <p className="eyebrow text-white/35 mt-5 fade-up" style={{ animationDelay: '210ms' }}>No credit card · Free to use</p>
        </div>

        {/* Product mock: terminal */}
        <div className="fade-up" style={{ animationDelay: '160ms' }}>
          <Terminal />
        </div>
      </section>

      {/* Logos / trust strip */}
      <section className="max-w-6xl mx-auto px-6 pb-8">
        <p className="eyebrow text-white/30 text-center mb-5">Built on a fast, modern, $0 stack</p>
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-white/40 text-sm mono">
          {['Groq · Llama 3.3 70B', 'Jina embeddings v3', 'pgvector RAG', 'Neon Postgres', 'Paiza runner', 'Next.js'].map(t => (
            <span key={t}>{t}</span>
          ))}
        </div>
      </section>

      {/* Justify section 1 — generate */}
      <Showcase
        kicker="Step one"
        title="Type a goal. Get a plan."
        body="No blank-page paralysis. Describe what you want to learn in plain language and Graa builds a realistic, day-by-day curriculum — sized to your deadline and skill level."
        bullets={['Infers a sensible duration', 'Maps phases → daily tasks', 'Edit it by just chatting']}
        visual={<Terminal compact />}
      />

      {/* Justify section 2 — learn */}
      <Showcase
        reverse
        kicker="Every day"
        title="One focused lesson. Curated for you."
        body="Each day pulls the best video, documentation, and a written lesson from across the web into a single page — then checks your understanding before you move on."
        bullets={['Best video + docs, auto-curated', 'A written lesson, grounded in real sources', 'Pass a quiz to unlock practice']}
        visual={<DayCard />}
      />

      {/* Justify section 3 — mentor */}
      <Showcase
        kicker="Always on"
        title="A mentor that actually knows your stuff."
        body="Stuck? Ask Graa. Unlike a generic chatbot, it answers grounded in your own curriculum using RAG — so the help is specific to exactly what you’re learning today."
        bullets={['Grounded in your curriculum (RAG)', 'Streams answers in real time', 'Available on every page']}
        visual={<ChatMock />}
      />

      {/* How it works */}
      <section id="how" className="max-w-6xl mx-auto px-6 py-20 scroll-mt-24">
        <h2 className="display text-3xl sm:text-5xl text-center mb-12">How it works</h2>
        <div className="grid gap-4 sm:grid-cols-3 stagger">
          {STEPS.map((s, i) => (
            <div key={s.n} className="glass rounded-2xl p-6" style={{ ['--i' as string]: i }}>
              <div className="mono text-orange-500 text-2xl font-bold mb-3">{s.n}</div>
              <h3 className="font-semibold text-lg mb-1.5">{s.title}</h3>
              <p className="text-white/50 text-sm leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-6xl mx-auto px-6 py-16 scroll-mt-24">
        <div className="text-center mb-12">
          <h2 className="display text-3xl sm:text-5xl">The whole loop</h2>
          <p className="text-white/50 mt-3">Plan → learn → test → build. Not just another to-do list.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 stagger">
          {FEATURES.map(({ icon: Icon, title, desc, color, bg }, i) => (
            <div key={title} className="glass card-glow rounded-2xl p-6" style={{ ['--i' as string]: i }}>
              <div className={`w-11 h-11 ${bg} rounded-xl flex items-center justify-center mb-4`}>
                <Icon size={19} className={color} />
              </div>
              <h3 className="font-semibold mb-2">{title}</h3>
              <p className="text-white/50 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <div className="glass-strong rounded-3xl px-8 py-16 text-center relative overflow-hidden">
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full pointer-events-none"
               style={{ background: 'radial-gradient(circle, rgba(255,106,0,0.16), transparent 70%)' }} />
          <h2 className="relative display text-4xl sm:text-6xl">Pick a goal.<br />Start day one.</h2>
          <p className="relative text-white/55 mt-5 max-w-md mx-auto">Your first roadmap is ready in seconds. Free, forever.</p>
          <Link href="/register" className="relative btn-primary px-8 py-4 text-sm inline-flex items-center gap-2 mt-9 group">
            Create your roadmap
            <ArrowRight size={17} className="group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </section>

      <footer className="max-w-6xl mx-auto px-6 py-10 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3">
        <Logo size={26} />
        <p className="text-white/30 text-sm">Graa AI — learn anything, day by day.</p>
      </footer>
    </div>
  )
}

/* ---------- Product mockups (pure CSS, no images) ---------- */

function Terminal({ compact = false }: { compact?: boolean }) {
  return (
    <div className="glass-strong rounded-2xl overflow-hidden shadow-2xl">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/8">
        <span className="w-3 h-3 rounded-full bg-rose-500/80" />
        <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
        <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
        <span className="ml-2 mono text-xs text-white/35">graa — new roadmap</span>
      </div>
      <div className="p-5 mono text-[13px] leading-relaxed">
        <p className="text-white/50"><span className="text-orange-400">$</span> graa new <span className="text-emerald-300">&quot;Master Rust in 30 days&quot;</span></p>
        <p className="text-white/40 mt-2">✓ analyzing goal…</p>
        <p className="text-white/40">✓ roadmap ready · <span className="text-white/70">30 days</span> · beginner</p>
        <div className="mt-3 space-y-1.5">
          {[
            ['01', 'Ownership & borrowing'],
            ['02', 'Structs, enums & pattern matching'],
            ['03', 'Error handling with Result'],
            ...(compact ? [] : [['04', 'Traits & generics'], ['05', 'Build: a CLI tool 🦀']] as [string, string][]),
          ].map(([n, t]) => (
            <p key={n} className="text-white/70"><span className="text-orange-500">{n}</span>  {t}</p>
          ))}
          {!compact && <p className="text-white/30">…</p>}
        </div>
      </div>
    </div>
  )
}

function DayCard() {
  return (
    <div className="glass-strong rounded-2xl p-5 shadow-2xl">
      <div className="eyebrow text-orange-400 mb-2">Day 03</div>
      <h4 className="font-semibold text-lg">Error handling with Result</h4>
      <div className="mt-4 space-y-2">
        {[
          { icon: PlayCircle, label: 'Watch · 12 min', color: 'text-rose-400' },
          { icon: FileText, label: 'Read · docs + lesson', color: 'text-blue-400' },
          { icon: GraduationCap, label: 'Quiz · 5 questions', color: 'text-yellow-400' },
          { icon: Wrench, label: 'Build · handle a failing parse', color: 'text-emerald-400' },
        ].map(({ icon: Icon, label, color }) => (
          <div key={label} className="flex items-center gap-3 rounded-lg border border-white/8 px-3 py-2.5">
            <Icon size={16} className={color} />
            <span className="text-sm text-white/75">{label}</span>
            <Check size={15} className="ml-auto text-white/20" />
          </div>
        ))}
      </div>
    </div>
  )
}

function ChatMock() {
  return (
    <div className="glass-strong rounded-2xl p-5 shadow-2xl space-y-3">
      <div className="flex justify-end">
        <div className="bg-orange-500/15 border border-orange-400/20 rounded-2xl rounded-tr-sm px-3.5 py-2 text-sm text-white/85 max-w-[80%]">
          Why use Result instead of throwing?
        </div>
      </div>
      <div className="flex gap-2">
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center flex-shrink-0">
          <Bot size={14} className="text-[#120a02]" />
        </div>
        <div className="bg-white/5 border border-white/8 rounded-2xl rounded-tl-sm px-3.5 py-2 text-sm text-white/75 max-w-[80%]">
          In Rust, errors are values. <span className="text-orange-300">Result&lt;T, E&gt;</span> forces you to handle the failure path at compile time — no surprise exceptions…
        </div>
      </div>
      <div className="eyebrow text-white/30 pt-1">Grounded in your Day 3 lesson</div>
    </div>
  )
}

function Showcase({
  kicker, title, body, bullets, visual, reverse = false,
}: {
  kicker: string
  title: string
  body: string
  bullets: string[]
  visual: React.ReactNode
  reverse?: boolean
}) {
  return (
    <section className="max-w-6xl mx-auto px-6 py-14">
      <div className={`grid lg:grid-cols-2 gap-10 items-center ${reverse ? 'lg:[&>*:first-child]:order-2' : ''}`}>
        <div>
          <div className="eyebrow text-orange-400 mb-3">{kicker}</div>
          <h2 className="display text-3xl sm:text-4xl">{title}</h2>
          <p className="text-white/55 mt-4 leading-relaxed max-w-md">{body}</p>
          <ul className="mt-6 space-y-2.5">
            {bullets.map(b => (
              <li key={b} className="flex items-center gap-2.5 text-sm text-white/75">
                <span className="w-5 h-5 rounded-full bg-orange-500/15 flex items-center justify-center flex-shrink-0">
                  <Check size={12} className="text-orange-400" />
                </span>
                {b}
              </li>
            ))}
          </ul>
        </div>
        <div>{visual}</div>
      </div>
    </section>
  )
}
