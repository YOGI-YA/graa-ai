// Free, local, no-API embeddings via Transformers.js (all-MiniLM-L6-v2, 384-dim).
// The model (~90MB) downloads once on first use and is cached on disk; every
// embedding after that runs entirely on the local CPU at zero cost.

import { pipeline, env, type FeatureExtractionPipeline } from '@xenova/transformers'

export const EMBEDDING_DIM = 384
const MODEL = 'Xenova/all-MiniLM-L6-v2'

// Allow remote download (default) but cache locally inside the project.
env.cacheDir = './.cache/transformers'
env.allowLocalModels = true

let extractorPromise: Promise<FeatureExtractionPipeline> | null = null

function getExtractor(): Promise<FeatureExtractionPipeline> {
  if (!extractorPromise) {
    extractorPromise = pipeline('feature-extraction', MODEL) as Promise<FeatureExtractionPipeline>
  }
  return extractorPromise
}

/** Embed a single string into a normalized 384-dim vector. */
export async function embed(text: string): Promise<number[]> {
  const extractor = await getExtractor()
  const output = await extractor(text, { pooling: 'mean', normalize: true })
  return Array.from(output.data as Float32Array)
}

/** Embed many strings (sequentially — the model is single-threaded on CPU). */
export async function embedBatch(texts: string[]): Promise<number[][]> {
  const out: number[][] = []
  for (const t of texts) out.push(await embed(t))
  return out
}

/** pgvector accepts a vector literal like "[0.1,0.2,...]". */
export function toVectorLiteral(vec: number[]): string {
  return `[${vec.join(',')}]`
}
