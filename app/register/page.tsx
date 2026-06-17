'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import AuthShell from '@/components/AuthShell'
import GoogleButton from '@/components/GoogleButton'

const LEARNING_STYLES = [
  { value: 'visual', label: 'Visual' },
  { value: 'reading', label: 'Reading' },
  { value: 'hands-on', label: 'Hands-on' },
  { value: 'structured', label: 'Structured' },
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
    <AuthShell title="Create account" subtitle="Start achieving your learning goals today.">
      <GoogleButton label="Sign up with Google" />
      <div className="flex items-center gap-3 my-4">
        <div className="h-px flex-1 bg-white/10" />
        <span className="eyebrow text-white/30">or</span>
        <div className="h-px flex-1 bg-white/10" />
      </div>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          className="field px-4 py-2.5 text-sm"
          placeholder="Full name"
          required
        />
        <input
          type="email"
          value={form.email}
          onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
          className="field px-4 py-2.5 text-sm"
          placeholder="Email address"
          required
        />
        <input
          type="password"
          value={form.password}
          onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
          className="field px-4 py-2.5 text-sm"
          placeholder="Password · min. 8 characters"
          minLength={8}
          required
        />
        <div>
          <p className="eyebrow text-white/40 mb-2">Learning style · optional</p>
          <div className="grid grid-cols-4 gap-1.5">
            {LEARNING_STYLES.map(s => (
              <button
                key={s.value}
                type="button"
                onClick={() => setForm(f => ({ ...f, learningStyle: f.learningStyle === s.value ? '' : s.value }))}
                className={`py-2 rounded-lg text-xs font-medium border transition-all ${
                  form.learningStyle === s.value
                    ? 'bg-orange-400/15 border-orange-300/50 text-white'
                    : 'bg-white/5 border-white/10 text-white/55 hover:border-white/25'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
        {error && <p className="text-rose-300 text-xs bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">{error}</p>}
        <button type="submit" disabled={loading} className="btn-primary w-full py-2.5 flex items-center justify-center gap-2 text-sm">
          {loading ? <><Loader2 size={15} className="animate-spin" /> Creating account…</> : 'Create account'}
        </button>
      </form>
      <p className="text-center text-white/45 text-sm mt-6">
        Already have an account?{' '}
        <Link href="/login" className="text-orange-400 hover:text-orange-300 font-semibold">Sign in</Link>
      </p>
    </AuthShell>
  )
}
