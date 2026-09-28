/**
 * Client-Side Curriculum & Document Text Extractor
 * Extracts text directly in the user's browser (0ms upload delay, 0 server payload limits).
 * Bypasses Vercel's 4.5MB Serverless Function Payload Limit (HTTP 413) by turning
 * multi-megabyte PDFs (e.g. 7MB - 50MB textbooks) into a compact, structured
 * 15KB - 40KB syllabus text before sending to the AI.
 */

export interface ExtractionProgressCallback {
  (status: string, percent?: number): void
}

/**
 * Dynamically resolves PDF.js in the browser.
 * Tries local bundled build first, then CDN fallback.
 */
async function loadPdfJs(): Promise<any> {
  if (typeof window === 'undefined') return null

  // 1. Check if already loaded globally on window
  if ((window as any).pdfjsLib) {
    return (window as any).pdfjsLib
  }

  // 2. Try importing local build from pdfjs-dist
  try {
    // @ts-ignore
    const pdfjs = await import('pdfjs-dist/build/pdf.min.mjs')
    if (pdfjs && pdfjs.GlobalWorkerOptions) {
      pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'
      return pdfjs
    }
  } catch (err) {
    console.warn('Local pdfjs-dist import fallback to CDN:', err)
  }

  // 3. Fallback to CDN script if bundler has issues with worker
  return new Promise((resolve, reject) => {
    const existingScript = document.querySelector('script[src*="pdf.min.js"]')
    if (existingScript) {
      const check = setInterval(() => {
        if ((window as any).pdfjsLib) {
          clearInterval(check)
          resolve((window as any).pdfjsLib)
        }
      }, 50)
      setTimeout(() => {
        clearInterval(check)
        if ((window as any).pdfjsLib) resolve((window as any).pdfjsLib)
        else reject(new Error('PDF.js load timeout'))
      }, 5000)
      return
    }

    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
    script.async = true
    script.onload = () => {
      const lib = (window as any).pdfjsLib
      if (lib) {
        lib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
        resolve(lib)
      } else {
        reject(new Error('PDF.js failed to initialize'))
      }
    }
    script.onerror = () => reject(new Error('Could not load PDF extraction engine'))
    document.head.appendChild(script)
  })
}

/**
 * Recursively extracts titles from PDF bookmarks/outline.
 * In large textbooks (300-600 pages), the outline provides the exact
 * syllabus, units, and chapters in under 50ms without reading every page!
 */
function extractOutlineItems(items: any[], depth = 0): string[] {
  const lines: string[] = []
  const indent = '  '.repeat(depth)
  for (const item of items) {
    if (item && item.title) {
      lines.push(`${indent}• ${item.title.trim()}`)
    }
    if (item && Array.isArray(item.items) && item.items.length > 0) {
      lines.push(...extractOutlineItems(item.items, depth + 1))
    }
  }
  return lines
}

/**
 * Extracts high-density syllabus text from a PDF buffer in the browser.
 * Handles large textbooks (10MB-50MB+, 500+ pages) by smartly extracting
 * the Table of Contents, Syllabus section, and Unit outlines.
 */
export async function extractTextFromPdfInBrowser(
  buffer: ArrayBuffer,
  onProgress?: ExtractionProgressCallback
): Promise<string> {
  onProgress?.('Initializing PDF extraction engine...', 10)
  const pdfjs = await loadPdfJs()
  if (!pdfjs) {
    throw new Error('PDF extraction engine is not available in this browser.')
  }

  onProgress?.('Loading document structure...', 20)
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(buffer),
    useSystemFonts: true,
    disableFontFace: true,
    isEvalSupported: false,
  })

  const pdf = await loadingTask.promise
  const numPages = pdf.numPages
  onProgress?.(`Document opened (${numPages} pages detected)...`, 30)

  // 1. Check for PDF Bookmarks / Outline (Instant Table of Contents)
  try {
    const outline = await pdf.getOutline()
    if (outline && outline.length >= 3) {
      onProgress?.('Found structured Table of Contents in document...', 45)
      const outlineLines = extractOutlineItems(outline)
      if (outlineLines.length >= 5) {
        const outlineText = [
          '# Course Syllabus & Table of Contents Outline (Extracted from Document Bookmarks)',
          ...outlineLines,
        ].join('\n')

        // If outline is rich and comprehensive, supplement with first 5 pages for title & course info
        const introPagesToRead = Math.min(numPages, 5)
        const introTextPieces: string[] = []
        for (let i = 1; i <= introPagesToRead; i++) {
          const page = await pdf.getPage(i)
          const textContent = await page.getTextContent()
          const pageStr = textContent.items
            .map((item: any) => item.str || '')
            .join(' ')
            .replace(/\s+/g, ' ')
            .trim()
          if (pageStr) introTextPieces.push(pageStr)
        }

        const combined = `${outlineText}\n\n# Course Overview & Syllabus Details\n${introTextPieces.join('\n\n')}`
        onProgress?.('Extracted complete syllabus outline!', 100)
        return combined.slice(0, 12000)
      }
    }
  } catch (err) {
    console.warn('Outline extraction skipped:', err)
  }

  // 2. Page-by-page extraction with smart prioritization for large textbooks
  // If <= 20 pages: Read every page
  // If > 20 pages (e.g. 500-page book): Prioritize first 16 pages (where Table of Contents and Syllabus reside)
  const pagesToScan: number[] = []
  if (numPages <= 20) {
    for (let i = 1; i <= numPages; i++) pagesToScan.push(i)
  } else {
    for (let i = 1; i <= Math.min(numPages, 16); i++) {
      pagesToScan.push(i)
    }
  }

  const extractedPages: string[] = []
  const totalToScan = pagesToScan.length

  for (let idx = 0; idx < totalToScan; idx++) {
    const pageNum = pagesToScan[idx]
    const percent = Math.round(30 + ((idx + 1) / totalToScan) * 60)
    onProgress?.(`Reading syllabus content (Page ${pageNum} of ${numPages})...`, percent)

    try {
      const page = await pdf.getPage(pageNum)
      const textContent = await page.getTextContent()
      const pageStrings = textContent.items
        .map((item: any) => item.str || '')
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim()

      if (pageStrings && pageStrings.length > 25) {
        extractedPages.push(`--- Page ${pageNum} ---\n${pageStrings}`)
      }
    } catch (pageErr) {
      console.warn(`Error reading page ${pageNum}:`, pageErr)
    }
  }

  onProgress?.('Finalizing extracted curriculum text...', 95)
  const fullText = extractedPages.join('\n\n')

  if (!fullText || fullText.trim().length < 20) {
    throw new Error('Could not extract readable text from PDF. The document might be an image scan or encrypted.')
  }

  onProgress?.('Curriculum text ready!', 100)
  return fullText.slice(0, 12000)
}

/**
 * Main universal client-side curriculum extractor.
 * Reads TXT, Markdown, CSV, JSON, and multi-megabyte PDFs right in the browser.
 */
export async function extractTextFromCurriculumClient(
  file: File,
  onProgress?: ExtractionProgressCallback
): Promise<string> {
  const ext = file.name.toLowerCase().split('.').pop() || ''

  // 1. Plain text / Markdown / CSV / JSON
  if (['txt', 'md', 'markdown', 'json', 'csv', 'rtf'].includes(ext) || file.type.startsWith('text/')) {
    onProgress?.('Reading text file...', 50)
    try {
      const text = await file.text()
      if (text.trim() && text.trim().length > 10) {
        onProgress?.('Text loaded successfully', 100)
        return text.trim().slice(0, 25000)
      }
    } catch (err) {
      console.warn('Text file read error:', err)
    }
  }

  // 2. PDF Documents (Extract directly in browser to bypass 4.5MB limit)
  if (ext === 'pdf' || file.type === 'application/pdf') {
    try {
      onProgress?.('Reading PDF buffer into memory...', 5)
      const buffer = await file.arrayBuffer()
      const text = await extractTextFromPdfInBrowser(buffer, onProgress)
      if (text && text.trim().length > 20) {
        return text.trim()
      }
    } catch (err) {
      console.warn('Client-side PDF extraction error:', err)
      throw err
    }
  }

  return ''
}
