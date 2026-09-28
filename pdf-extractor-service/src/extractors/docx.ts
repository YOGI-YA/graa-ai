import mammoth from 'mammoth'
import { cleanAcademicText } from '../utils/textCleaner.js'

export interface DocxExtractionResult {
  text: string
}

/**
 * Extracts text from Word documents (.docx, .doc).
 */
export async function extractTextFromDocxBuffer(buffer: Buffer): Promise<DocxExtractionResult> {
  try {
    const result = await mammoth.extractRawText({ buffer })
    const text = cleanAcademicText(result.value || '')
    if (!text || text.length < 10) {
      throw new Error('Word document contains no readable text.')
    }
    return { text }
  } catch (err) {
    throw new Error(`Failed to parse Word document: ${err instanceof Error ? err.message : String(err)}`)
  }
}
