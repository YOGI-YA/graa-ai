import en from './locales/en.json'
import hi from './locales/hi.json'
import bn from './locales/bn.json'
import te from './locales/te.json'
import ta from './locales/ta.json'
import mr from './locales/mr.json'
import gu from './locales/gu.json'
import ur from './locales/ur.json'
import kn from './locales/kn.json'
import ml from './locales/ml.json'
import pa from './locales/pa.json'
import or from './locales/or.json'

export type LocaleKey = keyof typeof en
export type TranslationDict = typeof en

const LOCALES: Record<string, any> = {
  en,
  hi,
  bn,
  te,
  ta,
  mr,
  gu,
  ur,
  kn,
  ml,
  pa,
  or,
}

// Deep get helper for nested dot notation keys e.g. "nav.dashboard"
function getNestedValue(obj: any, path: string): string | undefined {
  if (!obj) return undefined
  const parts = path.split('.')
  let current = obj
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part]
    } else {
      return undefined
    }
  }
  return typeof current === 'string' ? current : undefined
}

export function translate(
  lang: string,
  key: string,
  params?: Record<string, string | number>
): string {
  const currentLocale = LOCALES[lang] || LOCALES.en
  let template = getNestedValue(currentLocale, key)

  // Fallback to English if missing in target language
  if (template === undefined) {
    template = getNestedValue(LOCALES.en, key)
  }

  if (template === undefined) {
    return key
  }

  if (!params) return template

  return Object.entries(params).reduce(
    (acc, [k, v]) => acc.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v)),
    template
  )
}
