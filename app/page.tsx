import Link from 'next/link'
import { Target, MessageSquare, BookOpen, GraduationCap, Wrench, Sparkles, ArrowRight } from 'lucide-react'
import Logo from '@/components/Logo'

const FEATURES = [
  { icon: Target, title: 'Day-by-day roadmaps', desc: 'Describe a goal and get a structured plan, split into focused daily lessons — with a duration the AI sizes for you.', color: 'text-indigo-300', bg: 'bg-indigo-500/12' },
  { icon: BookOpen, title: 'Curated daily content', desc: 'Each day pulls the best video, docs, and a written lesson from across the web — no tab-hopping.', color: 'text-cyan-300', bg: 'bg-cyan-500/12' },
  { icon: GraduationCap, title: 'Quizzes that unlock', desc: 'A short MCQ check after every lesson. Pass it to prove you got it and unlock the day’s practice.', color: 'text-purple-300', bg: 'bg-purple-500/12' },
  { icon: Wrench, title: 'Hands-on practice', desc: 'A real in-browser sandbox seeded with the day’s task, so you actually build — not just read.', color: 'text-emerald-300', bg: 'bg-emerald-500/12' },
  { icon: MessageSquare, title: 'AI mentor that knows you', desc: 'Ask anything. The mentor answers grounded in your own curriculum, streaming in real time.', color: 'text-pink-300', bg: 'bg-pink-500/12' },
  { icon: Sparkles, title: 'Adapts to you', desc: 'Set your level and pace once; every roadmap, lesson, and task shapes itself around how you learn.', color: 'text-amber-300', bg: 'bg-amber-500/12' },
]

const STEPS = [
  { n: '01', title: 'Set a goal', desc: 'Tell the AI what you want to learn and how long you have.' },
  { n: '02', title: 'Learn each day', desc: 'Watch, read, and absorb a focused, curated lesson.' },
  { n: '03', title: 'Test & build', desc: 'Pass the quiz, then apply it in a live sandbox.' },
]

export default function HomePage() {
  return (
    <div className="min-h-screen text-white overflow-x-hidden">
      {/* Nav */}
      <nav className="sticky top-0 z-40">
        <div className="max-w-6xl mx-auto m-3 sm:m-4 px-4 sm:px-6 py-3 flex items-center justify-between glass rounded-2xl">
          <Logo size={32} />
          <div className="hidden md:flex items-center gap-7 text-sm text-white/50">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#how" className="hover:text-white transition-colors">How it works</a>
          </div>
          <div className="flex items-center gap-2.5">
            <Link href="/login" className="text-white/65 hover:text-white transition-colors text-sm px-3 py-2">Sign in</Link>
            <Link href="/register" className="btn-primary px-4 py-2 text-sm">Get started</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative max-w-5xl mx-auto px-6 pt-20 sm:pt-28 pb-20 text-center">
        <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 text-sm text-cyan-100/90 mb-8 fade-up">
          <Sparkles size={13} className="text-cyan-300" />
          Your personal AI learning coach
        </div>
        <h1 className="text-5xl sm:text-7xl font-semibold leading-[1.05] tracking-tight text-balance fade-up" style={{ animationDelay: '60ms' }}>
          Learn anything,
          <br className="hidden sm:block" /> <span className="gradient-text">one day at a time</span>
        </h1>
        <p className="text-lg sm:text-xl text-white/60 max-w-2xl mx-auto mt-7 leading-relaxed text-balance fade-up" style={{ animationDelay: '120ms' }}>
          Turn any goal into a day-by-day roadmap with curated lessons, quizzes,
          hands-on practice, and an AI mentor that actually knows what you’re learning.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-10 fade-up" style={{ animationDelay: '180ms' }}>
          <Link href="/register" className="btn-primary px-7 py-3.5 inline-flex items-center gap-2 group">
            Start learning free
            <ArrowRight size={17} className="group-hover:translate-x-0.5 transition-transform" />
          </Link>
          <Link href="/login" className="btn-ghost px-7 py-3.5">I have an account</Link>
        </div>
        <p className="text-xs text-white/35 mt-5 fade-up" style={{ animationDelay: '220ms' }}>No credit card · Free to use</p>
      </section>

      {/* How it works */}
      <section id="how" className="max-w-5xl mx-auto px-6 py-16 scroll-mt-24">
        <div className="grid gap-4 sm:grid-cols-3 stagger">
          {STEPS.map((s, i) => (
            <div key={s.n} className="glass rounded-2xl p-6" style={{ ['--i' as string]: i }}>
              <div className="text-3xl font-semibold gradient-text mb-3">{s.n}</div>
              <h3 className="font-semibold mb-1.5">{s.title}</h3>
              <p className="text-white/50 text-sm leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-6xl mx-auto px-6 py-16 scroll-mt-24">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight">Everything you need to actually finish</h2>
          <p className="text-white/50 mt-3">A full learning loop — not just another to-do list.</p>
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

      {/* CTA */}
      <section className="max-w-4xl mx-auto px-6 py-20">
        <div className="glass-strong rounded-3xl px-8 py-14 text-center relative overflow-hidden">
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-72 bg-violet-500/20 blur-3xl rounded-full pointer-events-none" />
          <h2 className="relative text-3xl sm:text-4xl font-semibold tracking-tight">Ready to start day one?</h2>
          <p className="relative text-white/55 mt-3 max-w-md mx-auto">Pick a goal, and your roadmap is ready in seconds.</p>
          <Link href="/register" className="relative btn-primary px-8 py-3.5 inline-flex items-center gap-2 mt-8 group">
            Create your roadmap
            <ArrowRight size={17} className="group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </section>

      <footer className="max-w-6xl mx-auto px-6 py-10 border-t border-white/5 text-center text-white/30 text-sm">
        AI Goal Mentor — built to help you learn, day by day.
      </footer>
    </div>
  )
}
