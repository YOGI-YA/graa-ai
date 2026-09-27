'use client'
import React, { useState, useEffect } from 'react'
import { Globe, Sparkles, Check, Search, ArrowRight, ShieldCheck } from 'lucide-react'
import { INDIAN_LANGUAGES, LanguageInfo, getLanguage } from '@/lib/languages'
import { useTranslation } from '@/lib/LanguageContext'

interface FirstTimeLanguageModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function FirstTimeLanguageModal({
  isOpen,
  onClose,
}: FirstTimeLanguageModalProps) {
  const { language, setLanguage, t } = useTranslation()
  const [selectedCode, setSelectedCode] = useState<string>(language || 'en')
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<'popular' | 'all'>('popular')

  useEffect(() => {
    if (language) {
      setSelectedCode(language)
    }
  }, [language])

  if (!isOpen) return null

  const filteredLanguages = INDIAN_LANGUAGES.filter(lang => {
    if (tab === 'popular' && !lang.popular && !search.trim()) {
      return false
    }
    if (!search.trim()) return true
    const q = search.toLowerCase().trim()
    return (
      lang.name.toLowerCase().includes(q) ||
      lang.nativeName.toLowerCase().includes(q) ||
      (lang.region && lang.region.toLowerCase().includes(q))
    )
  })

  const selectedLangObj = getLanguage(selectedCode)

  const handleConfirm = () => {
    setLanguage(selectedCode)
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('graa_language_prompted', 'true')
      } catch {}
    }
    onClose()
  }

  const handleEnglishDefault = () => {
    setLanguage('en')
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('graa_language_prompted', 'true')
      } catch {}
    }
    onClose()
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="language-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
    >
      <div className="relative w-full max-w-2xl max-h-[92vh] glass-strong border border-white/12 rounded-3xl p-5 sm:p-7 flex flex-col shadow-2xl shadow-orange-500/10 scale-in overflow-hidden">
        {/* Glow ambient background */}
        <div
          className="absolute -top-24 -right-24 w-60 h-60 rounded-full pointer-events-none opacity-20 blur-3xl"
          style={{ background: 'radial-gradient(circle, #f97316 0%, transparent 70%)' }}
        />
        <div
          className="absolute -bottom-24 -left-24 w-60 h-60 rounded-full pointer-events-none opacity-15 blur-3xl"
          style={{ background: 'radial-gradient(circle, #fbbf24 0%, transparent 70%)' }}
        />

        {/* Modal Header */}
        <div className="relative z-10 flex flex-col items-center text-center pb-4 border-b border-white/8">
          <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-orange-500/20 to-amber-500/10 border border-orange-500/30 flex items-center justify-center mb-3 shadow-lg shadow-orange-500/20">
            <Globe className="text-orange-400" size={26} />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-300 text-xs font-medium mb-2">
            <Sparkles size={12} className="text-orange-400" />
            <span>Welcome to Graa AI</span>
          </div>

          <h2 id="language-modal-title" className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            Choose Your Learning Language
          </h2>
          <p className="text-xs sm:text-sm text-white/60 max-w-lg mt-1.5 leading-relaxed">
            Select the language you feel most comfortable learning in. All AI roadmaps, video lessons, and interactive guidance will adapt to your choice.
          </p>
        </div>

        {/* Controls: Tabs & Search */}
        <div className="relative z-10 pt-4 pb-2 space-y-2.5">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-xl p-1 text-xs">
              <button
                type="button"
                onClick={() => setTab('popular')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                  tab === 'popular'
                    ? 'bg-orange-500 text-white shadow-md shadow-orange-500/30'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                Popular Languages (12)
              </button>
              <button
                type="button"
                onClick={() => setTab('all')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                  tab === 'all'
                    ? 'bg-orange-500 text-white shadow-md shadow-orange-500/30'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                All 22 Languages
              </button>
            </div>

            <span className="text-[11px] text-white/40 hidden sm:inline">
              Can be changed anytime in Profile
            </span>
          </div>

          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/35" size={15} />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search language (e.g., Hindi, Tamil, Telugu, English, Marathi)..."
              className="w-full bg-white/[0.04] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-orange-500/60 focus:bg-white/[0.07] transition-all"
            />
          </div>
        </div>

        {/* Language Grid */}
        <div className="relative z-10 flex-1 overflow-y-auto py-2 my-1 pr-1 custom-scrollbar min-h-[160px] max-h-[280px] sm:max-h-[320px]">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {filteredLanguages.map(lang => {
              const isSelected = selectedCode === lang.code
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => setSelectedCode(lang.code)}
                  className={`group relative flex items-center justify-between p-3 rounded-2xl text-left border transition-all duration-150 ${
                    isSelected
                      ? 'bg-orange-500/15 border-orange-400/60 shadow-md shadow-orange-500/15 ring-1 ring-orange-400/40'
                      : 'bg-white/[0.03] border-white/8 hover:bg-white/[0.07] hover:border-white/15'
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-base sm:text-lg font-bold tracking-tight ${isSelected ? 'text-orange-200' : 'text-white'}`}>
                        {lang.nativeName}
                      </span>
                    </div>
                    <div className="text-xs text-white/50 group-hover:text-white/70 transition-colors truncate">
                      {lang.name}
                    </div>
                    {lang.region && (
                      <div className="text-[10px] text-white/35 truncate mt-0.5 max-w-[140px]">
                        {lang.region}
                      </div>
                    )}
                  </div>

                  <div className="shrink-0">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                        isSelected
                          ? 'bg-orange-500 text-white shadow-sm shadow-orange-500/40'
                          : 'border border-white/15 text-transparent group-hover:border-white/30'
                      }`}
                    >
                      <Check size={13} strokeWidth={3} />
                    </div>
                  </div>
                </button>
              )
            })}

            {filteredLanguages.length === 0 && (
              <div className="col-span-full text-center py-8 text-white/40 text-xs">
                No languages found matching &ldquo;{search}&rdquo;. Try another name.
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="relative z-10 pt-4 border-t border-white/8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-[11px] text-white/45">
            <ShieldCheck size={13} className="text-emerald-400" />
            <span>Switch language anytime from Profile</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {selectedCode !== 'en' && (
              <button
                type="button"
                onClick={handleEnglishDefault}
                className="px-3.5 py-2 rounded-xl text-xs text-white/60 hover:text-white hover:bg-white/5 transition-colors"
              >
                Use English
              </button>
            )}

            <button
              type="button"
              onClick={handleConfirm}
              className="btn-primary flex-1 sm:flex-none px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <span>
                Continue with {selectedLangObj.nativeName} ({selectedLangObj.name})
              </span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
