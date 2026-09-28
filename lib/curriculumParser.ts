import mammoth from 'mammoth'
import axios from 'axios'
import zlib from 'zlib'
import { logger } from './logger'
import { nvidiaKeys } from './groq'

function decodePdfString(raw: string): string {
  if (!raw) return ''
  // Hex strings: <48656c6c6f20576f726c64>
  if (raw.startsWith('<') && raw.endsWith('>')) {
    const hex = raw.slice(1, -1).replace(/\s+/g, '')
    if (hex.length % 2 === 0) {
      if (hex.toLowerCase().startsWith('feff')) {
        const buf = Buffer.from(hex.slice(4), 'hex')
        return buf.toString('utf16le')
      }
      return Buffer.from(hex, 'hex').toString('latin1')
    }
  }

  return raw
    .replace(/\\([0-7]{1,3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)))
    .replace(/\\([\\()nrtbf])/g, (_, esc) => {
      if (esc === 'n') return '\n'
      if (esc === 'r') return '\r'
      if (esc === 't') return '\t'
      return esc
    })
}

/**
 * Pure Node.js high-performance PDF stream decompressor & text extractor.
 * Handles compressed FlateDecode streams, raw text blocks, TJ arrays, and hex strings.
 * Zero external worker dependency — works reliably across all Node/Next.js runtimes and file sizes (1MB-50MB+).
 */
export function extractTextFromPdfPureNode(buffer: Buffer): string {
  const textPieces: string[] = []
  let pos = 0
  const maxLen = buffer.length

  while (pos < maxLen) {
    const streamIdx = buffer.indexOf('stream', pos)
    if (streamIdx === -1) break

    let start = streamIdx + 6
    if (buffer[start] === 0x0d && buffer[start + 1] === 0x0a) {
      start += 2
    } else if (buffer[start] === 0x0a || buffer[start] === 0x0d) {
      start += 1
    }

    const endIdx = buffer.indexOf('endstream', start)
    if (endIdx === -1) break

    const streamBuffer = buffer.subarray(start, endIdx)
    const dictSlice = buffer.subarray(Math.max(0, streamIdx - 400), streamIdx).toString('latin1')
    let decompressed: Buffer | null = null

    if (dictSlice.includes('/FlateDecode') || dictSlice.includes('/Fl')) {
      try {
        decompressed = zlib.inflateSync(streamBuffer)
      } catch {
        try {
          decompressed = zlib.inflateRawSync(streamBuffer)
        } catch {
          // not flate
        }
      }
    } else {
      decompressed = streamBuffer
    }

    if (decompressed) {
      const content = decompressed.toString('latin1')

      // 1. Text arrays: [(Title) 10 (Unit) 10 (1)] TJ
      const tjArrayMatches = content.match(/\[([^\[\]]*)\]\s*TJ/g)
      if (tjArrayMatches) {
        for (const arr of tjArrayMatches) {
          const innerStrings = arr.match(/\(([^()]*)\)|<([0-9a-fA-F\s]+)>/g)
          if (innerStrings) {
            const line = innerStrings.map(s => decodePdfString(s.startsWith('(') ? s.slice(1, -1) : s)).join('')
            if (line.trim()) textPieces.push(line)
          }
        }
      }

      // 2. Direct string operator: (Text) Tj or <Hex> Tj
      const tjMatches = content.match(/\(([^()]*)\)\s*Tj|<([0-9a-fA-F\s]+)>\s*Tj/g)
      if (tjMatches) {
        for (const m of tjMatches) {
          const raw = m.replace(/\s*Tj$/, '')
          const decoded = decodePdfString(raw.startsWith('(') ? raw.slice(1, -1) : raw)
          if (decoded.trim()) textPieces.push(decoded)
        }
      }

      // 3. Newline string operator: (Text) ' or (Text) "
      const quoteMatches = content.match(/\(([^()]*)\)\s*['"]/g)
      if (quoteMatches) {
        for (const q of quoteMatches) {
          const raw = q.replace(/\s*['"]$/, '')
          const decoded = decodePdfString(raw.startsWith('(') ? raw.slice(1, -1) : raw)
          if (decoded.trim()) textPieces.push(decoded)
        }
      }
    }

    pos = endIdx + 9
  }

  // Also check uncompressed text blocks
  const fullAscii = buffer.toString('latin1')
  const plainTj = fullAscii.match(/\(([^()]{3,})\)\s*Tj/g)
  if (plainTj) {
    for (const m of plainTj) {
      const raw = m.replace(/^\(/, '').replace(/\)\s*Tj$/, '')
      const decoded = decodePdfString(raw)
      if (decoded.trim()) textPieces.push(decoded)
    }
  }

  const result = textPieces.join(' ').replace(/\s+/g, ' ').trim()
  return result
}

async function transcribeImageBufferWithVision(buffer: Buffer, mimeType: string): Promise<string> {
  const keys = nvidiaKeys()
  if (keys.length === 0) {
    logger.warn('CURRICULUM_PARSE', 'No NVIDIA_API_KEY configured for image OCR')
    return ''
  }

  const base64Image = buffer.toString('base64')
  const dataUrl = `data:${mimeType};base64,${base64Image}`

  for (const key of keys) {
    try {
      const response = await axios.post(
        'https://integrate.api.nvidia.com/v1/chat/completions',
        {
          model: process.env.NVIDIA_MODEL || 'meta/llama-3.2-11b-vision-instruct',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: 'Extract and transcribe all curriculum content, course titles, module/unit names, chapters, topics, subtopics, textbooks, and grading criteria from this syllabus document image. Format cleanly in markdown.',
                },
                {
                  type: 'image_url',
                  image_url: { url: dataUrl },
                },
              ],
            },
          ],
          max_tokens: 3000,
          temperature: 0.1,
        },
        {
          headers: {
            Authorization: `Bearer ${key}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          timeout: 45000,
        }
      )

      const result = response.data?.choices?.[0]?.message?.content?.trim()
      if (result) return result
    } catch (err) {
      logger.warn('CURRICULUM_PARSE', 'Vision OCR key failed, trying next key if available', {
        err: err instanceof Error ? err.message : String(err),
      })
      continue
    }
  }

  return ''
}

function isValidDocumentText(text: string): boolean {
  if (!text || text.trim().length < 20) return false
  const printableWords = text.match(/[A-Za-z0-9]{2,}/g) || []
  return printableWords.length >= 6
}

async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  // Method 1: PDFParse library class (Mozilla pdf.js engine - full font, layout, unicode support)
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfModule = require('pdf-parse')
    const PDFParse = pdfModule.PDFParse || pdfModule.default?.PDFParse || (typeof pdfModule === 'function' ? pdfModule : null)
    if (PDFParse) {
      if (typeof PDFParse === 'function' && PDFParse.prototype?.getText) {
        const parser = new PDFParse({ data: buffer })
        const result = await parser.getText()
        if (typeof parser.destroy === 'function') {
          await parser.destroy().catch(() => {})
        }
        const text = (typeof result === 'string' ? result : result?.text || '').trim()
        if (isValidDocumentText(text)) {
          logger.info('CURRICULUM_PARSE', 'Extracted text via PDFParse engine', { charCount: text.length })
          return text
        }
      } else if (typeof PDFParse === 'function') {
        const data = await PDFParse(buffer).catch(() => null)
        const text = (typeof data?.text === 'string' ? data.text : '').trim()
        if (isValidDocumentText(text)) {
          logger.info('CURRICULUM_PARSE', 'Extracted text via pdf-parse function', { charCount: text.length })
          return text
        }
      }
    }
  } catch (err) {
    logger.warn('CURRICULUM_PARSE', 'PDFParse engine extraction failed, trying pure Node stream extractor', { err: String(err) })
  }

  // Method 2: High-performance pure Node.js FlateDecode stream extractor
  try {
    const streamText = extractTextFromPdfPureNode(buffer)
    if (isValidDocumentText(streamText)) {
      logger.info('CURRICULUM_PARSE', 'Extracted text via Pure Node PDF Stream Extractor', {
        charCount: streamText.length,
        preview: streamText.slice(0, 100),
      })
      return streamText
    }
  } catch (err) {
    logger.warn('CURRICULUM_PARSE', 'Pure Node PDF stream extraction failed, trying Vision AI OCR', { err: String(err) })
  }

  // Method 3: If text is sparse or document is an image scan, pass to Vision AI OCR
  try {
    const visionText = await transcribeImageBufferWithVision(buffer, 'image/png')
    if (isValidDocumentText(visionText)) {
      logger.info('CURRICULUM_PARSE', 'Extracted text via Vision AI OCR', { charCount: visionText.length })
      return visionText.trim()
    }
  } catch (err) {
    logger.warn('CURRICULUM_PARSE', 'Vision AI OCR failed for PDF', { err: String(err) })
  }

  throw new Error('Failed to parse PDF document. Please ensure the PDF is not password-protected or empty.')
}

async function extractTextFromDocx(buffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ buffer })
    return result.value || ''
  } catch (err) {
    logger.error('CURRICULUM_PARSE', 'DOCX parsing failed', err)
    throw new Error('Failed to parse Word document (.docx).')
  }
}

async function extractViaMicroservice(buffer: Buffer, fileName: string): Promise<string | null> {
  const serviceUrl = process.env.PDF_EXTRACTOR_SERVICE_URL || process.env.PDF_EXTRACTOR_URL
  if (!serviceUrl) return null

  try {
    const endpoint = `${serviceUrl.replace(/\/+$/, '')}/extract`
    const blob = new Blob([new Uint8Array(buffer)])
    const formData = new FormData()
    formData.append('file', blob, fileName)

    const res = await axios.post(endpoint, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 45000,
    })

    if (res.data?.success && typeof res.data.text === 'string' && res.data.text.trim()) {
      logger.info('CURRICULUM_PARSE', 'Extracted curriculum via Extractor Microservice', {
        charCount: res.data.metadata?.charCount || res.data.char_count,
        unitsDetected: res.data.metadata?.unitsDetected || res.data.units_detected,
      })
      return res.data.text.trim()
    }
  } catch (err) {
    logger.warn('CURRICULUM_PARSE', 'Microservice call failed, falling back to local extractor', {
      err: err instanceof Error ? err.message : String(err),
    })
  }
  return null
}

export async function parseCurriculumBuffer(
  buffer: Buffer,
  fileName: string,
  mimeType?: string
): Promise<{ text: string; fileName: string; charCount: number }> {
  const ext = fileName.toLowerCase().split('.').pop() || ''
  let text = ''

  // 1. Try dedicated microservice first if configured
  const microserviceText = await extractViaMicroservice(buffer, fileName)
  if (microserviceText) {
    return {
      text: microserviceText,
      fileName,
      charCount: microserviceText.length,
    }
  }

  if (ext === 'pdf' || mimeType === 'application/pdf') {
    text = await extractTextFromPdf(buffer)
  } else if (ext === 'docx' || mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    text = await extractTextFromDocx(buffer)
  } else if (['png', 'jpg', 'jpeg', 'webp'].includes(ext) || mimeType?.startsWith('image/')) {
    text = await transcribeImageBufferWithVision(buffer, mimeType || `image/${ext === 'jpg' ? 'jpeg' : ext}`)
  } else if (['txt', 'md', 'markdown', 'csv', 'json', 'rtf'].includes(ext) || mimeType?.startsWith('text/')) {
    text = buffer.toString('utf-8')
  } else {
    try {
      text = buffer.toString('utf-8')
    } catch {
      throw new Error(`Unsupported file format: .${ext}. Please upload a PDF, DOCX, TXT, MD, or Image file.`)
    }
  }

  const cleanedText = text
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  if (!cleanedText || cleanedText.length < 15) {
    throw new Error('The uploaded file appears to be empty or contains insufficient text.')
  }

  return {
    text: cleanedText,
    fileName,
    charCount: cleanedText.length,
  }
}
