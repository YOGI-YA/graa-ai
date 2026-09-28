export interface SyllabusUnit {
  unit: string
  title: string
  topics: string[]
  bodySnippet: string
}

export interface DocumentMetadata {
  filename: string
  format: string
  sizeBytes: number
  pageCount?: number
  charCount: number
  unitsDetected: number
}

export interface ExtractionResult {
  success: boolean
  metadata: DocumentMetadata
  condensedOutline: string
  units: SyllabusUnit[]
  text: string
  error?: string
}

export interface ExtractionOptions {
  maxPages?: number
  extractUnits?: boolean
}
