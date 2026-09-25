export interface LanguageInfo {
  code: string
  name: string
  nativeName: string
  script: string
  dir: 'ltr' | 'rtl'
  popular?: boolean
  region?: string
}

export const INDIAN_LANGUAGES: LanguageInfo[] = [
  { code: 'en', name: 'English', nativeName: 'English', script: 'Latin', dir: 'ltr', popular: true, region: 'Pan-India / Global' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', script: 'Devanagari', dir: 'ltr', popular: true, region: 'North / Central India' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', script: 'Bengali', dir: 'ltr', popular: true, region: 'West Bengal, Tripura' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', script: 'Telugu', dir: 'ltr', popular: true, region: 'Andhra Pradesh, Telangana' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', script: 'Devanagari', dir: 'ltr', popular: true, region: 'Maharashtra, Goa' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', script: 'Tamil', dir: 'ltr', popular: true, region: 'Tamil Nadu, Puducherry' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', script: 'Gujarati', dir: 'ltr', popular: true, region: 'Gujarat' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو', script: 'Perso-Arabic', dir: 'rtl', popular: true, region: 'Pan-India / Telangana, UP, Bihar, J&K' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', script: 'Kannada', dir: 'ltr', popular: true, region: 'Karnataka' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', script: 'Malayalam', dir: 'ltr', popular: true, region: 'Kerala, Lakshadweep' },
  { code: 'or', name: 'Odia', nativeName: 'ଓଡ଼ିଆ', script: 'Odia', dir: 'ltr', popular: true, region: 'Odisha' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', script: 'Gurmukhi', dir: 'ltr', popular: true, region: 'Punjab, Delhi, Haryana' },
  { code: 'as', name: 'Assamese', nativeName: 'অসমীয়া', script: 'Bengali-Assamese', dir: 'ltr', region: 'Assam' },
  { code: 'mai', name: 'Maithili', nativeName: 'मैथिली', script: 'Devanagari', dir: 'ltr', region: 'Bihar, Jharkhand' },
  { code: 'sat', name: 'Santali', nativeName: 'ᱥᱟᱱᱛᱟᱲᱤ / संताली', script: 'Ol Chiki / Devanagari', dir: 'ltr', region: 'Jharkhand, West Bengal, Odisha' },
  { code: 'ks', name: 'Kashmiri', nativeName: 'كٲشُر / कॉशुर', script: 'Perso-Arabic / Devanagari', dir: 'rtl', region: 'Jammu & Kashmir' },
  { code: 'ne', name: 'Nepali', nativeName: 'नेपाली', script: 'Devanagari', dir: 'ltr', region: 'Sikkim, West Bengal, Assam' },
  { code: 'sd', name: 'Sindhi', nativeName: 'سنڌي / सिंधी', script: 'Perso-Arabic / Devanagari', dir: 'rtl', region: 'Gujarat, Maharashtra, Rajasthan' },
  { code: 'kok', name: 'Konkani', nativeName: 'कोंकणी', script: 'Devanagari / Roman', dir: 'ltr', region: 'Goa, Maharashtra, Karnataka' },
  { code: 'doi', name: 'Dogri', nativeName: 'डोगरी', script: 'Devanagari', dir: 'ltr', region: 'Jammu & Kashmir, Himachal Pradesh' },
  { code: 'mni', name: 'Manipuri (Meitei)', nativeName: 'ꯃꯤꯇꯩꯂꯣꯟ / মণিপুরী', script: 'Meetei Mayek / Bengali', dir: 'ltr', region: 'Manipur' },
  { code: 'brx', name: 'Bodo', nativeName: 'बड़ो', script: 'Devanagari', dir: 'ltr', region: 'Assam, Bodoland' },
  { code: 'sa', name: 'Sanskrit', nativeName: 'संस्कृतम्', script: 'Devanagari', dir: 'ltr', region: 'Classical / Pan-India' },
]

export const DEFAULT_LANGUAGE = 'en'

export function getLanguage(code?: string | null): LanguageInfo {
  if (!code) return INDIAN_LANGUAGES[0]
  const cleanCode = code.toLowerCase().trim()
  const found = INDIAN_LANGUAGES.find(l => l.code === cleanCode || l.name.toLowerCase() === cleanCode)
  return found || INDIAN_LANGUAGES[0]
}

export function isRtlLanguage(code?: string | null): boolean {
  const lang = getLanguage(code)
  return lang.dir === 'rtl'
}
