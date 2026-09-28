import fs from 'fs'
import path from 'path'

function ensureEnvLoaded() {
  if (typeof process === 'undefined' || !process.env) return
  if (process.env.NODE_ENV !== 'production' && typeof window === 'undefined') {
    try {
      for (const file of ['.env.local', '.env']) {
        const p = path.resolve(process.cwd(), file)
        if (fs.existsSync(p)) {
          const content = fs.readFileSync(p, 'utf-8')
          for (const line of content.split('\n')) {
            const match = line.match(/^([A-Za-z0-9_]+)=["']?([^"'\r\n]+)["']?/)
            if (match && match[1] && match[2] && !process.env[match[1]]) {
              process.env[match[1]] = match[2]
            }
          }
        }
      }
    } catch {}
  }
}
ensureEnvLoaded()

export const EMBEDDING_DIM = Number(process.env.EMBEDDING_DIM || 384)

// Health and cooldown tracking for embedding keys
const keyCooldowns = new Map<string, number>()
let roundRobinIndex = 0

function isKeyHealthy(key: string): boolean {
  const cooldownUntil = keyCooldowns.get(key)
  if (!cooldownUntil) return true
  if (Date.now() > cooldownUntil) {
    keyCooldowns.delete(key)
    return true
  }
  return false
}

function markKeyCooldown(key: string, cooldownMs: number) {
  keyCooldowns.set(key, Date.now() + cooldownMs)
}

export function getEmbeddingKeys(): string[] {
  ensureEnvLoaded()
  const found: string[] = []
  for (const [k, v] of Object.entries(process.env)) {
    if (!v || typeof v !== 'string' || !v.trim()) continue
    if (
      /^EMBEDDINGS?_API_KEY.*$/i.test(k) ||
      /^EMBEDDINGS?_KEY.*$/i.test(k) ||
      /^JINA_API_KEY.*$/i.test(k)
    ) {
      found.push(v.trim())
    }
  }
  return Array.from(new Set(found))
}

function getBalancedEmbeddingKeys(): string[] {
  const keys = getEmbeddingKeys()
  if (keys.length <= 1) return keys

  roundRobinIndex = (roundRobinIndex + 1) % keys.length
  const reordered: string[] = []
  for (let i = 0; i < keys.length; i++) {
    reordered.push(keys[(roundRobinIndex + i) % keys.length])
  }

  // Prioritize keys not currently on cooldown
  return reordered.sort((a, b) => {
    const aHealthy = isKeyHealthy(a)
    const bHealthy = isKeyHealthy(b)
    if (aHealthy && !bHealthy) return -1
    if (!aHealthy && bHealthy) return 1
    return 0
  })
}

export const isEmbeddingsEnabled = () => getEmbeddingKeys().length > 0

export const embeddingsEnabled = Boolean(
  (typeof process !== 'undefined' && process.env.EMBEDDINGS_API_KEY) ||
  (typeof process !== 'undefined' && process.env.EMBEDDINGS_API_KEY_1) ||
  getEmbeddingKeys().length > 0
)

interface EmbeddingsResponse {
  data?: Array<{ embedding: number[]; index?: number }>
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

/** Embed one or more texts with multi-key rotation and resilient fallback across Jina / OpenAI-compatible keys. */
export async function embedBatch(texts: string[]): Promise<number[][]> {
  const keys = getBalancedEmbeddingKeys()
  if (keys.length === 0) {
    throw new Error('Embeddings API not configured (set EMBEDDINGS_API_KEY or EMBEDDINGS_API_KEY_1)')
  }
  if (texts.length === 0) return []

  const apiUrl = process.env.EMBEDDINGS_API_URL || 'https://api.jina.ai/v1/embeddings'
  const model = process.env.EMBEDDINGS_MODEL || 'jina-embeddings-v3'

  let lastError: Error | null = null

  // Try up to 3 rounds across all available keys
  for (let round = 0; round < 3; round++) {
    const activeKeys = getBalancedEmbeddingKeys()

    for (const key of activeKeys) {
      if (!isKeyHealthy(key) && round < 2) {
        continue
      }

      try {
        const res = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${key}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            input: texts,
            dimensions: EMBEDDING_DIM, // truncates (Matryoshka) so the DB column stays 384
          }),
        })

        if (res.ok) {
          const json = (await res.json()) as EmbeddingsResponse
          const rows = json.data ?? []
          return rows
            .slice()
            .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
            .map(r => r.embedding)
        }

        const detail = await res.text().catch(() => '')
        const errMessage = `Embeddings API ${res.status}: ${detail.slice(0, 200)}`
        lastError = new Error(errMessage)

        if (res.status === 429) {
          // Rate limited -> cooldown for 35 seconds
          markKeyCooldown(key, 35000)
        } else if (res.status === 401 || res.status === 403) {
          // Auth failed / quota expired -> cooldown for 5 minutes
          markKeyCooldown(key, 300000)
        } else if (res.status >= 500) {
          // Transient provider error -> cooldown for 15 seconds
          markKeyCooldown(key, 15000)
        }
      } catch (err: any) {
        lastError = err instanceof Error ? err : new Error(String(err))
        markKeyCooldown(key, 10000)
      }
    }

    if (round < 2) {
      await sleep(1000 * (round + 1))
    }
  }

  throw lastError || new Error('All configured embedding keys failed or are currently rate-limited.')
}

export async function embed(text: string): Promise<number[]> {
  const [vec] = await embedBatch([text])
  return vec
}

/** pgvector accepts a vector literal like "[0.1,0.2,...]". */
export function toVectorLiteral(vec: number[]): string {
  return `[${vec.join(',')}]`
}
