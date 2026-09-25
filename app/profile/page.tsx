'use client'
import { useCallback, useEffect, useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Loader2, LogOut, Check, Target, CheckCircle2, Mail, Globe } from 'lucide-react'
import AppNav from '@/components/AppNav'
import LanguageSelector from '@/components/LanguageSelector'
import { useTranslation } from '@/lib/LanguageContext'

const LEARNING_STYLES = [
  { value: 'visual', label: 'Visual', desc: 'Diagrams & videos' },
  { value: 'reading', label: 'Reading', desc: 'Books & articles' },
  { value: 'hands-on', label: 'Hands-on', desc: 'Doing & practicing' },
  { value: 'structured', label: 'Structured', desc: 'Step-by-step plans' },
]

interface Profile {
  name: string
  email: string
  image: string | null
  learningStyle: string | null
  language?: string
  completedDays: number
  _count: { goals: number }
}

export default function ProfilePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { t, language, setLanguage } = useTranslation()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [name, setName] = useState('')
  const [learningStyle, setLearningStyle] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
  }, [status, router])

  useEffect(() => {
    if (status !== 'authenticated') return
    fetch('/api/profile')
      .then(r => (r.ok ? r.json() : null))
      .then((d: Profile | null) => {
        if (d) {
          setProfile(d)
          setName(d.name)
          setLearningStyle(d.learningStyle || '')
          if (d.language && d.language !== language) {
            setLanguage(d.language)
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [status, setLanguage, language])

  const save = useCallback(async () => {
    setSaving(true)
    setSaved(false)
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, learningStyle, language }),
      })
      if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 2000) }
    } finally {
      setSaving(false)
    }
  }, [name, learningStyle, language])

  const firstName = session?.user?.name?.split(' ')[0] ?? ''
  const initial = (name?.trim()?.[0] || firstName?.[0] || '').toUpperCase()

  return (
    <div className="min-h-screen text-white">
      <AppNav firstName={firstName} />
      <main className="max-w-3xl mx-auto px-4 sm:px-8 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 size={28} className="animate-spin text-orange-400" />
          </div>
        ) : profile ? (
          <div className="space-y-6 fade-up">
            {/* Header card */}
            <div className="glass-strong rounded-3xl p-6 sm:p-8 flex items-center gap-5">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center text-3xl font-bold text-[#120a02] shadow-xl shadow-orange-500/25 flex-shrink-0">
                {initial}
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl font-semibold tracking-tight truncate">{profile.name}</h1>
                <p className="text-white/50 text-sm flex items-center gap-1.5 mt-1"><Mail size={13} /> {profile.email}</p>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="glass card-glow rounded-2xl p-5">
                <div className="w-9 h-9 rounded-xl bg-orange-500/12 flex items-center justify-center mb-3">
                  <Target size={16} className="text-orange-300" />
                </div>
                <div className="text-2xl font-semibold">{profile._count.goals}</div>
                <div className="text-white/50 text-xs mt-1">{t('dashboard.totalGoals')}</div>
              </div>
              <div className="glass card-glow rounded-2xl p-5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/12 flex items-center justify-center mb-3">
                  <CheckCircle2 size={16} className="text-emerald-300" />
                </div>
                <div className="text-2xl font-semibold">{profile.completedDays}</div>
                <div className="text-white/50 text-xs mt-1">{t('dashboard.completedDays')}</div>
              </div>
            </div>

            {/* Language Selection Card */}
            <div className="glass rounded-2xl p-6 space-y-4">
              <div className="border-b border-white/8 pb-3">
                <h2 className="font-semibold text-base text-white flex items-center gap-2">
                  <Globe size={18} className="text-orange-400" />
                  {t('profile.preferredLanguage')}
                </h2>
                <p className="text-xs text-white/50 mt-1">
                  {t('profile.languageDesc')}
                </p>
              </div>
              <LanguageSelector variant="card" />
            </div>

            {/* Edit */}
            <div className="glass rounded-2xl p-6 space-y-5">
              <h2 className="font-semibold">{t('profile.personalInfo')}</h2>
              <div>
                <label className="block text-sm text-white/65 mb-1.5">{t('profile.name')}</label>
                <input value={name} onChange={e => setName(e.target.value)} className="field px-4 py-3 text-sm w-full bg-white/5 border border-white/10 rounded-xl" />
              </div>
              <div>
                <label className="block text-sm text-white/65 mb-2">{t('profile.learningStyle') || 'Learning Style'}</label>
                <div className="grid grid-cols-2 gap-2">
                  {LEARNING_STYLES.map(s => (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => setLearningStyle(v => (v === s.value ? '' : s.value))}
                      className={`p-3 rounded-xl text-left border transition-all text-xs ${
                        learningStyle === s.value
                          ? 'bg-orange-400/15 border-orange-300/50 text-white shadow-[0_0_0_3px_rgba(255,106,0,0.12)]'
                          : 'bg-white/5 border-white/10 text-white/60 hover:border-white/25'
                      }`}
                    >
                      <div className="font-medium">{s.label}</div>
                      <div className="text-white/40 mt-0.5">{s.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={save} disabled={saving} className="btn-primary px-5 py-2.5 text-sm flex items-center gap-2">
                  {saving ? <Loader2 size={15} className="animate-spin" /> : saved ? <Check size={15} /> : null}
                  {saved ? (t('profile.saved') || 'Saved') : (t('profile.saveBtn') || 'Save preferences')}
                </button>
                <button
                  onClick={() => signOut({ callbackUrl: '/' })}
                  className="btn-ghost px-5 py-2.5 text-sm flex items-center gap-2 text-red-200 hover:bg-red-500/10"
                >
                  <LogOut size={15} /> {t('nav.signOut')}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  )
}
