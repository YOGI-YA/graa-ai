'use client'
import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import AuthShell from '@/components/AuthShell'
import GoogleButton from '@/components/GoogleButton'
import { useTranslation } from '@/lib/LanguageContext'

export default function LoginPage() {
  const { t } = useTranslation()
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
    <AuthShell
      title={t('auth.loginTitle') || "Welcome back"}
      subtitle={t('auth.loginSubtitle') || "Sign in to continue your learning journey."}
    >
      <GoogleButton label={t('auth.googleBtn') || "Continue with Google"} />
      <div className="flex items-center gap-3 my-4">
        <div className="h-px flex-1 bg-white/10" />
        <span className="eyebrow text-white/30">or</span>
        <div className="h-px flex-1 bg-white/10" />
      </div>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="field px-4 py-2.5 text-sm"
          placeholder={t('auth.email') || "Email address"}
          required
        />
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="field px-4 py-2.5 text-sm"
          placeholder={t('auth.password') || "Password"}
          required
        />
        {error && <p className="text-rose-300 text-xs bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">{error}</p>}
        <button type="submit" disabled={loading} className="btn-primary w-full py-2.5 flex items-center justify-center gap-2 text-sm">
          {loading ? <><Loader2 size={15} className="animate-spin" /> {t('common.loading') || 'Signing in…'}</> : (t('auth.signInBtn') || 'Sign in')}
        </button>
      </form>
      <p className="text-center text-white/45 text-sm mt-6">
        {t('auth.noAccount') || "Don't have an account?"}{' '}
        <Link href="/register" className="text-orange-400 hover:text-orange-300 font-semibold">{t('auth.signUpLink') || "Sign up free"}</Link>
      </p>
    </AuthShell>
  )
}
