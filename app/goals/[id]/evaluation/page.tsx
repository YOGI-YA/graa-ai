import { notFound, redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import EvaluationDashboard, { type EvaluationData } from '@/components/evaluation/EvaluationDashboard'
import { headers } from 'next/headers'

export const dynamic = 'force-dynamic'

async function fetchEvaluationData(id: string, cookie: string, host: string, proto: string): Promise<EvaluationData | null> {
  try {
    const url = `${proto}://${host}/api/goals/${id}/evaluation`
    const res = await fetch(url, {
      headers: {
        cookie,
      },
      cache: 'no-store',
    })

    if (!res.ok) return null
    return await res.json()
  } catch (error) {
    console.error('Failed to fetch evaluation data', error)
    return null
  }
}

export default async function GoalEvaluationPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/login')

  const { id } = await params
  const headerList = await headers()
  const cookie = headerList.get('cookie') || ''
  const host = headerList.get('host') || 'localhost:3000'
  const proto = headerList.get('x-forwarded-proto') || 'http'

  const data = await fetchEvaluationData(id, cookie, host, proto)
  if (!data) notFound()

  return <EvaluationDashboard data={data} />
}
