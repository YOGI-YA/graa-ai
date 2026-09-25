'use client'
import React, { useState, useRef, useEffect } from 'react'
import { Languages, Check, Search, Globe, ChevronDown } from 'lucide-react'
import { INDIAN_LANGUAGES, LanguageInfo } from '@/lib/languages'
import { useTranslation } from '@/lib/LanguageContext'

interface LanguageSelectorProps {
  variant?: 'compact' | 'button' | 'card'
  className?: string
  onSelect?: (code: string) => void
}

export default function LanguageSelector({
  variant = 'compact',
  className = '',
  onSelect,
}: LanguageSelectorProps) {
  const { language, setLanguage, currentLang, t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<'popular' | 'all'>('popular')
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const filteredLanguages = INDIAN_LANGUAGES.filter(lang => {
    if (activeTab === 'popular' && !lang.popular && !search.trim()) {
      return false
    }
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      lang.name.toLowerCase().includes(q) ||
      lang.nativeName.toLowerCase().includes(q) ||
      (lang.region && lang.region.toLowerCase().includes(q))
    )
  })

  const handleSelect = (lang: LanguageInfo) => {
    setLanguage(lang.code)
    if (onSelect) onSelect(lang.code)
    setOpen(false)
    setSearch('')
  }

  if (variant === 'card') {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Globe className="text-orange-400" size={18} />
            <span className="text-sm font-semibold text-white">
              {t('common.selectLanguage')}
            </span>
          </div>
          <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-lg p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('popular')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                activeTab === 'popular'
                  ? 'bg-orange-500/20 text-orange-300 font-medium'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              Popular
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                activeTab === 'all'
                  ? 'bg-orange-500/20 text-orange-300 font-medium'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              All 22 Languages
            </button>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={15} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('common.filterLanguages')}
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-white/35 focus:outline-none focus:border-orange-500/50"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-72 overflow-y-auto pr-1">
          {filteredLanguages.map(lang => {
            const isSelected = language === lang.code
            return (
              <button
                key={lang.code}
                type="button"
                onClick={() => handleSelect(lang)}
                className={`flex items-center justify-between p-3 rounded-xl text-left border transition-all ${
                  isSelected
                    ? 'bg-orange-500/15 border-orange-400/40 text-white shadow-sm shadow-orange-500/10'
                    : 'bg-white/[0.03] border-white/8 text-white/80 hover:bg-white/[0.07] hover:border-white/15'
                }`}
              >
                <div>
                  <div className="text-sm font-medium flex items-center gap-2">
                    <span className="font-semibold text-orange-200">{lang.nativeName}</span>
                    <span className="text-xs text-white/45">({lang.name})</span>
                  </div>
                  {lang.region && (
                    <div className="text-[10px] text-white/40 truncate max-w-[170px] mt-0.5">
                      {lang.region}
                    </div>
                  )}
                </div>
                {isSelected && (
                  <span className="w-5 h-5 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center shrink-0">
                    <Check size={12} strokeWidth={3} />
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-label="Select Language"
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.09] border border-white/10 hover:border-white/20 text-xs text-white/80 hover:text-white transition-all shadow-sm"
      >
        <Languages size={14} className="text-orange-400" />
        <span className="font-medium text-orange-200">{currentLang.nativeName}</span>
        <ChevronDown
          size={12}
          className={`text-white/40 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-72 sm:w-80 glass-strong border border-white/15 rounded-2xl p-2.5 shadow-2xl shadow-black/80 z-50 scale-in origin-top-right">
          <div className="flex items-center justify-between pb-2 border-b border-white/8 mb-2">
            <div className="text-xs font-semibold text-white/90 flex items-center gap-1.5">
              <Globe size={13} className="text-orange-400" />
              <span>{t('common.selectLanguage')}</span>
            </div>
            <div className="flex items-center gap-1 bg-white/5 rounded-lg p-0.5 text-[10px]">
              <button
                type="button"
                onClick={() => setActiveTab('popular')}
                className={`px-2 py-0.5 rounded ${
                  activeTab === 'popular' ? 'bg-orange-500/20 text-orange-300 font-medium' : 'text-white/50'
                }`}
              >
                Top 10
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`px-2 py-0.5 rounded ${
                  activeTab === 'all' ? 'bg-orange-500/20 text-orange-300 font-medium' : 'text-white/50'
                }`}
              >
                All 22
              </button>
            </div>
          </div>

          <div className="relative mb-2">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/35" size={13} />
            <input
              type="text"
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t('common.filterLanguages')}
              className="w-full bg-white/5 border border-white/10 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-orange-500/40"
            />
          </div>

          <div className="max-h-60 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
            {filteredLanguages.map(lang => {
              const isSelected = language === lang.code
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => handleSelect(lang)}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left text-xs transition-colors ${
                    isSelected
                      ? 'bg-orange-500/20 text-orange-200 font-medium border border-orange-500/30'
                      : 'text-white/75 hover:text-white hover:bg-white/8 border border-transparent'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-white/95">{lang.nativeName}</span>
                      <span className="text-[10px] text-white/40">({lang.name})</span>
                    </div>
                    {lang.region && (
                      <div className="text-[9px] text-white/35 truncate max-w-[200px]">
                        {lang.region}
                      </div>
                    )}
                  </div>
                  {isSelected && <Check size={13} className="text-orange-400 shrink-0 ml-2" />}
                </button>
              )
            })}
            {filteredLanguages.length === 0 && (
              <div className="text-center py-4 text-xs text-white/40">
                No matching language found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
