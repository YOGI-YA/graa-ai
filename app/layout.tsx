import type { Metadata } from 'next'
import { Inter, JetBrains_Mono, Archivo_Black } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import Aurora from '@/components/Aurora'
import SeoJsonLd from '@/components/SeoJsonLd'
import { siteConfig } from '@/lib/site'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono', display: 'swap' })
const display = Archivo_Black({ subsets: ['latin'], weight: '400', variable: '--font-display', display: 'swap' })

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: 'Graa AI | Personalized AI Learning Platform',
    template: '%s | Graa AI',
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  keywords: [...siteConfig.keywords],
  alternates: { canonical: '/' },
  category: 'education',
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    siteName: siteConfig.name,
    title: 'Graa AI | Personalized AI Learning Platform',
    description: siteConfig.description,
  },
  twitter: {
    card: 'summary',
    title: 'Graa AI | Personalized AI Learning Platform',
    description: siteConfig.description,
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable} ${display.variable}`}>
      <body className="min-h-screen antialiased">
        <Aurora />
        <SeoJsonLd />
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
