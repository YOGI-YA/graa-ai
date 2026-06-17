import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import Aurora from '@/components/Aurora'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })

export const metadata: Metadata = {
  title: 'AI Goal Mentor — Learn anything, day by day',
  description: 'Turn any goal into a day-by-day roadmap with curated lessons, quizzes, hands-on practice, and an AI mentor.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen antialiased">
        <Aurora />
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
