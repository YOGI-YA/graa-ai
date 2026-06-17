import type { Metadata } from 'next'
import { Inter, JetBrains_Mono, Archivo_Black } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import Aurora from '@/components/Aurora'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono', display: 'swap' })
const display = Archivo_Black({ subsets: ['latin'], weight: '400', variable: '--font-display', display: 'swap' })

export const metadata: Metadata = {
  title: 'Graa AI — Learn anything, day by day',
  description: 'Turn any goal into a day-by-day roadmap with curated lessons, quizzes, hands-on practice, and Graa, your AI mentor.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable} ${display.variable}`}>
      <body className="min-h-screen antialiased">
        <Aurora />
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
