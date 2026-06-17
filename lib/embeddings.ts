// Hosted, scalable embeddings via any OpenAI-compatible /embeddings endpoint
// (Jina, OpenAI, Together, Mistral, etc.). No local model = small serverless
// functions, fast cold starts, scales horizontally. Free tier friendly.
//
// Configure with env:
//   EMBEDDINGS_API_URL   e.g. https://api.jina.ai/v1/embeddings
//   EMBEDDINGS_API_KEY   your free API key
//   EMBEDDINGS_MODEL     e.g. jina-embeddings-v3   (default below)
//   EMBEDDING_DIM        vector size (default 384 — matches the pgvector column)
//
// If no key is set, embeddings are DISABLED and RAG features no-op gracefully
// (chat still works, just without curriculum grounding).

export const EMBEDDING_DIM = Number(process.env.EMBEDDING_DIM || 384)

const API_URL = process.env.EMBEDDINGS_API_URL || 'https://api.jina.ai/v1/embeddings'
const API_KEY = process.env.EMBEDDINGS_API_KEY || ''
const API_MODEL = process.env.EMBEDDINGS_MODEL || 'jina-embeddings-v3'

export const embeddingsEnabled = Boolean(API_KEY)

interface EmbeddingsResponse {
  data?: Array<{ embedding: number[]; index?: number }>
}

/** Embed one or more texts in a single request (batched = scalable). */
export async function embedBatch(texts: string[]): Promise<number[][]> {
  if (!embeddingsEnabled) throw new Error('Embeddings API not configured (set EMBEDDINGS_API_KEY)')
  if (texts.length === 0) return []

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: API_MODEL,
      input: texts,
      dimensions: EMBEDDING_DIM, // truncates (Matryoshka) so the DB column stays 384
    }),
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`Embeddings API ${res.status}: ${detail.slice(0, 200)}`)
  }

  const json = (await res.json()) as EmbeddingsResponse
  const rows = json.data ?? []
  // Preserve input order even if the API returns an index field.
  return rows
    .slice()
    .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
    .map(r => r.embedding)
}

export async function embed(text: string): Promise<number[]> {
  const [vec] = await embedBatch([text])
  return vec
}

/** pgvector accepts a vector literal like "[0.1,0.2,...]". */
export function toVectorLiteral(vec: number[]): string {
  return `[${vec.join(',')}]`
}
