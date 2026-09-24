import { randomUUID } from 'crypto'
import { prisma } from './prisma'
import { embed, embedBatch, toVectorLiteral, EMBEDDING_DIM, embeddingsEnabled } from './embeddings'

<<<<<<< HEAD
=======


>>>>>>> origin/main
let storeReady: Promise<void> | null = null

export function ensureStore(): Promise<void> {
  if (!storeReady) {
    storeReady = (async () => {
      await prisma.$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS vector')
      await prisma.$executeRawUnsafe(
        `CREATE TABLE IF NOT EXISTS content_chunks (
          id text PRIMARY KEY,
          goal_id text NOT NULL,
          day int,
          source text,
          content text NOT NULL,
          embedding vector(${EMBEDDING_DIM})
        )`
      )
      await prisma.$executeRawUnsafe(
        'CREATE INDEX IF NOT EXISTS content_chunks_goal_idx ON content_chunks (goal_id)'
      )
    })().catch(err => {
      storeReady = null // allow retry on next call
      throw err
    })
  }
  return storeReady
}

function splitIntoChunks(text: string, maxLen = 900): string[] {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (!clean) return []
  if (clean.length <= maxLen) return [clean]
  const sentences = clean.split(/(?<=[.!?])\s+/)
  const chunks: string[] = []
  let current = ''
  for (const s of sentences) {
    if ((current + ' ' + s).length > maxLen && current) {
      chunks.push(current.trim())
      current = s
    } else {
      current += ' ' + s
    }
  }
  if (current.trim()) chunks.push(current.trim())
  return chunks
}

export interface IndexableDay {
  lesson?: {
    summary?: string
    sections?: { heading: string; body: string }[]
    keyPoints?: string[]
    practiceHint?: string
  } | null
  docs?: { title: string; source: string; snippet?: string }[]
}

/** Chunk + embed a day's content and (re)store it in the vector table. */
export async function indexDayContent(goalId: string, day: number, data: IndexableDay): Promise<number> {
  if (!embeddingsEnabled) return 0
  await ensureStore()

  const raw: { source: string; text: string }[] = []
  const lesson = data.lesson
  if (lesson?.summary) raw.push({ source: 'lesson:summary', text: lesson.summary })
  for (const s of lesson?.sections ?? []) raw.push({ source: 'lesson:section', text: `${s.heading}. ${s.body}` })
  if (lesson?.keyPoints?.length) raw.push({ source: 'lesson:keypoints', text: lesson.keyPoints.join('. ') })
  if (lesson?.practiceHint) raw.push({ source: 'lesson:practice', text: lesson.practiceHint })
  for (const d of data.docs ?? []) {
    if (d.snippet) raw.push({ source: `doc:${d.source}`, text: `${d.title}. ${d.snippet}` })
  }

  // Expand into size-bounded chunks.
  const chunks = raw.flatMap(r => splitIntoChunks(r.text).map(text => ({ source: r.source, text })))
  if (chunks.length === 0) return 0

  const vectors = await embedBatch(chunks.map(c => c.text))

  // Replace any prior chunks for this day, then insert fresh.
  await prisma.$executeRawUnsafe('DELETE FROM content_chunks WHERE goal_id = $1 AND day = $2', goalId, day)

  for (let i = 0; i < chunks.length; i++) {
    await prisma.$executeRawUnsafe(
      'INSERT INTO content_chunks (id, goal_id, day, source, content, embedding) VALUES ($1,$2,$3,$4,$5,$6::vector)',
      randomUUID(),
      goalId,
      day,
      chunks[i].source,
      chunks[i].text,
      toVectorLiteral(vectors[i])
    )
  }

  return chunks.length
}

export interface RetrievedChunk {
  content: string
  source: string
  score: number
}

/** Retrieve the most relevant chunks for a query within a goal. */
export async function retrieve(goalId: string, query: string, k = 5): Promise<RetrievedChunk[]> {
  if (!embeddingsEnabled) return []
  try {
    await ensureStore()
    const vec = toVectorLiteral(await embed(query))
    const rows = await prisma.$queryRawUnsafe<RetrievedChunk[]>(
      `SELECT content, source, 1 - (embedding <=> $1::vector) AS score
       FROM content_chunks
       WHERE goal_id = $2
       ORDER BY embedding <=> $1::vector
       LIMIT $3`,
      vec,
      goalId,
      k
    )
    return rows
  } catch (error) {
    console.error('RAG retrieve failed', error instanceof Error ? error.message : error)
    return []
  }
}
