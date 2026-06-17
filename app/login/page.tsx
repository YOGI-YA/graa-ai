'use client'
import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { LogoMark } from '@/components/Logo'
import GoogleButton from '@/components/GoogleButton'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await signIn('credentials', { email, password, redirect: false })
    if (res?.ok) {
      router.push('/dashboard')
    } else {
      setError('Invalid email or password')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md fade-up">
        <Link href="/" className="flex flex-col items-center text-center mb-8 group">
          <div className="mb-4 group-hover:scale-105 transition-transform">
            <LogoMark size={48} />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Welcome back</h1>
          <p className="text-white/50 text-sm mt-1.5">Sign in to continue your learning journey</p>
        </Link>
        <div className="glass-strong rounded-3xl p-8">
          <GoogleButton label="Sign in with Google" />
          <div className="flex items-center gap-3 my-5">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-xs text-white/35">or</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-white/65 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="field px-4 py-3 text-sm"
                placeholder="you@example.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-white/65 mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="field px-4 py-3 text-sm"
                placeholder="Password"
                required
              />
            </div>
            {error && <p className="text-red-300 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 flex items-center justify-center gap-2"
            >
              {loading ? <><Loader2 size={16} className="animate-spin" /> Signing in…</> : 'Sign in'}
            </button>
          </form>
          <p className="text-center text-white/50 text-sm mt-6">
            No account?{' '}
            <Link href="/register" className="text-cyan-300 hover:text-cyan-200 font-medium">Sign up free</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
