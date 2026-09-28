'use client'
import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import OverallPerformanceDashboard from '@/components/OverallPerformanceDashboard'

export default function PerformancePage() {
  const { status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
  }, [status, router])

  if (status === 'loading') return null

  return <OverallPerformanceDashboard />
}
