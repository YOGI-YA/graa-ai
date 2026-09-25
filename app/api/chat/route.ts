import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { streamChatWithMentor } from '@/lib/groq'
import { retrieve } from '@/lib/rag'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { messages, goalContext, goalId, language: requestedLang } = await req.json()
    if (!Array.isArray(messages)) {
      return NextResponse.json({ error: 'Messages are required' }, { status: 400 })
    }

    let augmentedContext: string | undefined = goalContext
    let targetLanguage = requestedLang || req.cookies.get('graa_lang')?.value || session.user.language || 'en'

    // RAG: when a specific goal is in focus, retrieve only the relevant chunks
    // for the latest question instead of dumping the whole roadmap.
    if (typeof goalId === 'string' && goalId) {
      const owns = await prisma.goal.findFirst({ where: { id: goalId, userId: session.user.id }, select: { id: true, language: true } })
      if (owns?.language && !requestedLang) {
        targetLanguage = owns.language
      }
      const lastUser = [...messages].reverse().find((m: { role: string; content: string }) => m.role === 'user')
      if (owns && lastUser?.content) {
        const chunks = await retrieve(goalId, lastUser.content, 5)
        if (chunks.length > 0) {
          const knowledge = chunks.map((c, i) => `[${i + 1}] ${c.content}`).join('\n')
          augmentedContext = `${goalContext ? goalContext + '\n\n' : ''}Relevant material from the learner's curriculum (use this to answer accurately):\n${knowledge}`
        }
      }
    }

    const stream = await streamChatWithMentor(messages, augmentedContext, { language: targetLanguage })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    })
  } catch (error) {
    console.error('Chat API error', error)
    return NextResponse.json({ error: 'AI mentor is unavailable right now' }, { status: 502 })
  }
}
