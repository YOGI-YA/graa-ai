import { extractText, getDocumentProxy } from 'unpdf'
import pdfParse from 'pdf-parse'
import { cleanAcademicText } from '../utils/textCleaner.js'

export interface PdfExtractionResult {
  text: string
  pageCount: number
}

/**
 * Extracts high-fidelity text and page metadata from a PDF buffer.
 */
export async function extractTextFromPdfBuffer(
  buffer: Buffer,
  maxPages: number = 100
): Promise<PdfExtractionResult> {
  // Method 1: unpdf (modern high-speed web standards PDF engine)
  try {
    const pdf = await getDocumentProxy(new Uint8Array(buffer))
    const totalPages = pdf.numPages
    const pagesToExtract = Math.min(totalPages, maxPages)

    const pageTexts: string[] = []
    for (let i = 1; i <= pagesToExtract; i++) {
      const page = await pdf.getPage(i)
      const textContent = await page.getTextContent()
      const pageStr = textContent.items
        .map((item: any) => item.str || '')
        .join(' ')
      if (pageStr.trim()) {
        pageTexts.push(cleanAcademicText(pageStr))
      }
    }

    const fullText = pageTexts.join('\n\n').trim()
    if (fullText.length >= 20) {
      return {
        text: fullText,
        pageCount: totalPages,
      }
    }
  } catch (err) {
    // Fall back to secondary engine
  }

  // Method 2: pdf-parse fallback
  try {
    const data = await pdfParse(buffer, {
      max: maxPages,
    })
    const cleaned = cleanAcademicText(data.text || '')
    if (cleaned.length >= 20) {
      return {
        text: cleaned,
        pageCount: data.numpages || 1,
      }
    }
  } catch (err) {
    // Fall through to error
  }

  throw new Error('Unable to extract text from PDF. The document may be empty, encrypted, or contain only non-OCR image scans.')
}
