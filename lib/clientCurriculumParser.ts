/**
 * Client-side Curriculum Text Extractor
 * Extracts text directly in the browser (0ms upload delay, 0 server payload limits).
 * Bypasses Vercel's 4.5MB Serverless Function Payload Limit (HTTP 413) by sending
 * lightweight extracted text (10KB-50KB) instead of huge binary files (7MB-50MB).
 */

function decodePdfString(raw: string): string {
  if (!raw) return ''
  if (raw.startsWith('<') && raw.endsWith('>')) {
    const hex = raw.slice(1, -1).replace(/\s+/g, '')
    if (hex.length % 2 === 0) {
      let str = ''
      for (let i = 0; i < hex.length; i += 2) {
        str += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16))
      }
      return str
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

async function decompressFlate(data: Uint8Array): Promise<Uint8Array | null> {
  if (typeof DecompressionStream === 'undefined') return null

  // Try standard zlib / deflate
  try {
    const ds = new DecompressionStream('deflate')
    const writer = ds.writable.getWriter()
    writer.write(data as any)
    writer.close()
    const reader = ds.readable.getReader()
    const chunks: Uint8Array[] = []
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      if (value) chunks.push(value as Uint8Array)
    }
    const total = chunks.reduce((acc, c) => acc + c.length, 0)
    const merged = new Uint8Array(total)
    let offset = 0
    for (const c of chunks) {
      merged.set(c, offset)
      offset += c.length
    }
    return merged
  } catch {
    // Try raw deflate
    try {
      const ds = new DecompressionStream('deflate-raw')
      const writer = ds.writable.getWriter()
      writer.write(data as any)
      writer.close()
      const reader = ds.readable.getReader()
      const chunks: Uint8Array[] = []
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        if (value) chunks.push(value as Uint8Array)
      }
      const total = chunks.reduce((acc, c) => acc + c.length, 0)
      const merged = new Uint8Array(total)
      let offset = 0
      for (const c of chunks) {
        merged.set(c, offset)
        offset += c.length
      }
      return merged
    } catch {
      return null
    }
  }
}

/**
 * Extract text from PDF buffer in the browser using Web APIs & stream decompression.
 */
export async function extractTextFromPdfInBrowser(buffer: ArrayBuffer): Promise<string> {
  const bytes = new Uint8Array(buffer)
  const textPieces: string[] = []
  const latin1Decoder = new TextDecoder('latin1')
  
  const fullText = latin1Decoder.decode(bytes)
  
  // Find all streams
  let pos = 0
  const maxLen = bytes.length

  while (pos < maxLen) {
    const streamIdx = fullText.indexOf('stream', pos)
    if (streamIdx === -1) break

    let start = streamIdx + 6
    if (bytes[start] === 0x0d && bytes[start + 1] === 0x0a) {
      start += 2
    } else if (bytes[start] === 0x0a || bytes[start] === 0x0d) {
      start += 1
    }

    const endIdx = fullText.indexOf('endstream', start)
    if (endIdx === -1) break

    const streamSlice = bytes.subarray(start, endIdx)
    const dictSlice = fullText.slice(Math.max(0, streamIdx - 300), streamIdx)

    let decompressed: Uint8Array | null = null
    if (dictSlice.includes('/FlateDecode') || dictSlice.includes('/Fl')) {
      decompressed = await decompressFlate(streamSlice)
    } else {
      decompressed = streamSlice
    }

    if (decompressed) {
      const content = latin1Decoder.decode(decompressed)

      // 1. Text arrays: [(Unit) 10 (1)] TJ
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

  // Also extract plain Tj strings in uncompressed sections
  const plainTj = fullText.match(/\(([^()]{3,})\)\s*Tj/g)
  if (plainTj) {
    for (const m of plainTj) {
      const raw = m.replace(/^\(/, '').replace(/\)\s*Tj$/, '')
      const decoded = decodePdfString(raw)
      if (decoded.trim()) textPieces.push(decoded)
    }
  }

  return textPieces.join(' ').replace(/\s+/g, ' ').trim()
}

/**
 * Universal client-side document extractor for any file uploaded by user.
 */
export async function extractTextFromCurriculumClient(file: File): Promise<string> {
  const ext = file.name.toLowerCase().split('.').pop() || ''

  // 1. Plain text / Markdown / CSV / JSON
  if (['txt', 'md', 'markdown', 'json', 'csv', 'rtf'].includes(ext) || file.type.startsWith('text/')) {
    try {
      const text = await file.text()
      if (text.trim()) return text.trim()
    } catch {}
  }

  // 2. PDF Document
  if (ext === 'pdf' || file.type === 'application/pdf') {
    try {
      const buffer = await file.arrayBuffer()
      const text = await extractTextFromPdfInBrowser(buffer)
      if (text.trim().length > 30) {
        return text.trim()
      }
    } catch (err) {
      console.warn('Client-side PDF extraction fallback:', err)
    }
  }

  return ''
}
