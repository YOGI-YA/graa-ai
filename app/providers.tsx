'use client'
import { SessionProvider } from 'next-auth/react'
import ChatLauncher from '@/components/ChatLauncher'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider refetchOnWindowFocus={false} refetchInterval={0}>
      {children}
      <ChatLauncher />
    </SessionProvider>
  )
}
