'use client'
import { SessionProvider } from 'next-auth/react'
import ChatLauncher from '@/components/ChatLauncher'
import { Toaster, ConfirmHost } from '@/components/Toast'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider refetchOnWindowFocus={false} refetchInterval={0}>
      {children}
      <ChatLauncher />
      <Toaster />
      <ConfirmHost />
    </SessionProvider>
  )
}
