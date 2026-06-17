import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const runtime = 'nodejs'
export const maxDuration = 30

// Multi-language code execution.
// Default: Paiza.io guest API (free, no key). For scale, set PISTON_URL to a
// self-hosted Piston instance and we use that instead.

interface RunResult { output: string; stdout: string; stderr: string; code: number }

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

// our language id -> paiza language name
const PAIZA_LANG: Record<string, string> = {
  javascript: 'javascript', typescript: 'typescript', python: 'python3', java: 'java',
  cpp: 'cpp', c: 'c', go: 'go', rust: 'rust', ruby: 'ruby', php: 'php', csharp: 'csharp',
}

async function runPaiza(language: string, source: string, stdin: string): Promise<RunResult> {
  const lang = PAIZA_LANG[language.toLowerCase()] || language.toLowerCase()
  const create = await fetch('https://api.paiza.io/runners/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ source_code: source, language: lang, input: stdin, api_key: 'guest', longpoll: 'true' }),
  })
  if (create.status === 429) throw new Error('Code runner is busy (rate limit). Try again in a moment.')
  if (!create.ok) throw new Error(`Runner error (${create.status})`)
  const created = await create.json()
  const id = created.id
  if (!id) throw new Error('Could not start the runner')

  for (let i = 0; i < 25; i++) {
    const r = await fetch(`https://api.paiza.io/runners/get_details?id=${id}&api_key=guest`)
    const d = await r.json()
    if (d.status === 'completed') {
      const stdout = d.stdout || ''
      const stderr = d.stderr || d.build_stderr || ''
      const output = [d.build_stderr, d.stdout, d.stderr].filter(Boolean).join('\n').trim()
      return { output: output || '(no output)', stdout, stderr, code: Number(d.exit_code ?? 0) }
    }
    await sleep(700)
  }
  throw new Error('Execution timed out')
}

async function runPiston(base: string, language: string, source: string, stdin: string): Promise<RunResult> {
  const runtimes = await (await fetch(`${base}/runtimes`)).json()
  const l = language.toLowerCase()
  const rt = runtimes.find((r: { language: string; aliases?: string[] }) => r.language === l || r.aliases?.includes(l))
  if (!rt) throw new Error(`Running ${language} isn't supported here.`)
  const res = await fetch(`${base}/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ language: rt.language, version: rt.version, files: [{ content: source }], stdin, run_timeout: 10000 }),
  })
  const data = await res.json()
  const run = data.run ?? {}
  const output = [data.compile?.stderr, run.stdout, run.stderr].filter(Boolean).join('\n').trim()
  return { output: output || '(no output)', stdout: run.stdout ?? '', stderr: run.stderr ?? '', code: run.code ?? 0 }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { language, source, stdin } = await req.json()
    if (typeof language !== 'string' || typeof source !== 'string') {
      return NextResponse.json({ error: 'language and source are required' }, { status: 400 })
    }

    const pistonUrl = process.env.PISTON_URL
    const result = pistonUrl
      ? await runPiston(pistonUrl.replace(/\/$/, ''), language, source, typeof stdin === 'string' ? stdin : '')
      : await runPaiza(language, source, typeof stdin === 'string' ? stdin : '')

    return NextResponse.json(result)
  } catch (error) {
    console.error('Run error', error)
    const message = error instanceof Error ? error.message : 'Code runner is unavailable right now'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
