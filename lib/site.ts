export const siteConfig = {
  name: 'Graa AI',
  description:
    'Graa AI is an AI-powered learning platform that turns any goal into a personalized day-by-day roadmap with curated lessons, quizzes, and hands-on practice.',
  url: (process.env.NEXT_PUBLIC_SITE_URL || 'https://graaai.vercel.app').replace(/\/$/, ''),
  keywords: [
    'Graa AI',
    'AI learning platform',
    'online learning platform',
    'personalized learning',
    'AI courses',
    'learning roadmap',
    'learn coding online',
    'skill development',
  ],
} as const
