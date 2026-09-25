'use client'
import React, { createContext, useContext, useEffect, useState, useTransition, useCallback } from 'react'
import { getLanguage, LanguageInfo, DEFAULT_LANGUAGE } from '@/lib/languages'
import { translate } from '@/lib/i18n'
import { useSession } from 'next-auth/react'

interface LanguageContextType {
  language: string
  setLanguage: (code: string) => void
  currentLang: LanguageInfo
  isRTL: boolean
  dir: 'ltr' | 'rtl'
  t: (key: string, params?: Record<string, string | number>) => string
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession()
  const [language, setLanguageState] = useState<string>(DEFAULT_LANGUAGE)
  const [, startTransition] = useTransition()

  // Initialize from storage or cookie on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('graa_lang')
      if (stored) {
        setLanguageState(stored)
        return
      }
      const match = document.cookie.match(/(^|;)\s*graa_lang=([^;]+)/)
      if (match && match[2]) {
        setLanguageState(decodeURIComponent(match[2]))
        return
      }
    } catch {}
  }, [])

  // Sync with user session if available
  useEffect(() => {
    if (session?.user && (session.user as any).language) {
      const userLang = (session.user as any).language
      setLanguageState(userLang)
      try {
        localStorage.setItem('graa_lang', userLang)
        document.cookie = `graa_lang=${encodeURIComponent(userLang)}; path=/; max-age=31536000; SameSite=Lax`
      } catch {}
    }
  }, [session])

  const setLanguage = useCallback((code: string) => {
    const langObj = getLanguage(code)
    const cleanCode = langObj.code

    startTransition(() => {
      setLanguageState(cleanCode)
    })

    try {
      localStorage.setItem('graa_lang', cleanCode)
      document.cookie = `graa_lang=${encodeURIComponent(cleanCode)}; path=/; max-age=31536000; SameSite=Lax`
      document.documentElement.dir = langObj.dir
      document.documentElement.lang = cleanCode

      // If user is logged in, optionally persist preference to profile
      if (session?.user) {
        fetch('/api/user/profile', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ language: cleanCode }),
        }).catch(() => {})
      }
    } catch {}
  }, [session])

  // Update HTML tag attributes on language change
  useEffect(() => {
    const langObj = getLanguage(language)
    document.documentElement.dir = langObj.dir
    document.documentElement.lang = langObj.code
  }, [language])

  const currentLang = getLanguage(language)
  const isRTL = currentLang.dir === 'rtl'

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => {
      return translate(language, key, params)
    },
    [language]
  )

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        currentLang,
        isRTL,
        dir: currentLang.dir,
        t,
      }}
    >
      {children}
    </LanguageContext.Provider>
  )
}

export function useTranslation() {
  const context = useContext(LanguageContext)
  if (!context) {
    // Return fallback if used outside provider
    const fallbackLang = getLanguage(DEFAULT_LANGUAGE)
    return {
      language: DEFAULT_LANGUAGE,
      setLanguage: () => {},
      currentLang: fallbackLang,
      isRTL: false,
      dir: 'ltr' as const,
      t: (key: string, params?: Record<string, string | number>) => translate(DEFAULT_LANGUAGE, key, params),
    }
  }
  return context
}
