import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      email: true,
      image: true,
      learningStyle: true,
      language: true,
      createdAt: true,
      _count: { select: { goals: true } },
    },
  })
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const completedDays = await prisma.task.count({
    where: { completed: true, goal: { userId: session.user.id } },
  })

  return NextResponse.json({ ...user, completedDays })
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const data: { name?: string; learningStyle?: string | null; language?: string } = {}
  if (typeof body.name === 'string' && body.name.trim()) data.name = body.name.trim()
  if (typeof body.learningStyle === 'string') data.learningStyle = body.learningStyle || null
  if (typeof body.language === 'string' && body.language.trim()) data.language = body.language.trim()

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data,
    select: { name: true, email: true, learningStyle: true, language: true, image: true },
  })

  return NextResponse.json(user)
}
