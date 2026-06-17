'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { LogoMark } from '@/components/Logo'
import GoogleButton from '@/components/GoogleButton'

const LEARNING_STYLES = [
  { value: 'visual', label: 'Visual', desc: 'Learn through diagrams & videos' },
  { value: 'reading', label: 'Reading', desc: 'Learn through books & articles' },
  { value: 'hands-on', label: 'Hands-on', desc: 'Learn by doing & practicing' },
  { value: 'structured', label: 'Structured', desc: 'Learn through step-by-step plans' },
]

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '', learningStyle: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    if (res.ok) {
      router.push('/login?registered=1')
    } else {
      setError(data.error || 'Registration failed')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md fade-up">
        <Link href="/" className="flex flex-col items-center text-center mb-8 group">
          <div className="mb-4 group-hover:scale-105 transition-transform">
            <LogoMark size={48} />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Create your account</h1>
          <p className="text-white/50 text-sm mt-1.5">Start achieving your learning goals today</p>
        </Link>
        <div className="glass-strong rounded-3xl p-8">
          <GoogleButton label="Sign up with Google" />
          <div className="flex items-center gap-3 my-5">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-xs text-white/35">or</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-white/65 mb-1.5">Full name</label>
              <input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="field px-4 py-3 text-sm"
                placeholder="Linus Torvalds"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-white/65 mb-1.5">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="field px-4 py-3 text-sm"
                placeholder="you@example.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-white/65 mb-1.5">Password</label>
              <input
                type="password"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                className="field px-4 py-3 text-sm"
                placeholder="Min. 8 characters"
                minLength={8}
                required
              />
            </div>
            <div>
              <label className="block text-sm text-white/65 mb-2">Learning style (optional)</label>
              <div className="grid grid-cols-2 gap-2">
                {LEARNING_STYLES.map(s => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, learningStyle: f.learningStyle === s.value ? '' : s.value }))}
                    className={`p-3 rounded-xl text-left border transition-all text-xs ${
                      form.learningStyle === s.value
                        ? 'bg-cyan-400/15 border-cyan-300/50 text-white shadow-[0_0_0_3px_rgba(34,211,238,0.10)]'
                        : 'bg-white/5 border-white/10 text-white/60 hover:border-white/25'
                    }`}
                  >
                    <div className="font-medium">{s.label}</div>
                    <div className="text-white/40 mt-0.5">{s.desc}</div>
                  </button>
                ))}
              </div>
            </div>
            {error && <p className="text-red-300 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 flex items-center justify-center gap-2"
            >
              {loading ? <><Loader2 size={16} className="animate-spin" /> Creating account…</> : 'Create account'}
            </button>
          </form>
          <p className="text-center text-white/50 text-sm mt-6">
            Already have an account?{' '}
            <Link href="/login" className="text-cyan-300 hover:text-cyan-200 font-medium">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
