'use client'
import { SessionProvider } from 'next-auth/react'
import ChatLauncher from '@/components/ChatLauncher'
import { Toaster, ConfirmHost } from '@/components/Toast'
import { LanguageProvider } from '@/lib/LanguageContext'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider refetchOnWindowFocus={false} refetchInterval={0}>
      <LanguageProvider>
        {children}
        <ChatLauncher />
        <Toaster />
        <ConfirmHost />
      </LanguageProvider>
    </SessionProvider>
  )
}
