/**
 * Client-side Curriculum Text Extractor
 * Reads plain-text curriculum formats (TXT, Markdown, CSV, JSON) directly in browser.
 * For binary documents (PDF, DOCX, Images), passes them to the high-fidelity server parser.
 */
export async function extractTextFromCurriculumClient(file: File): Promise<string> {
  const ext = file.name.toLowerCase().split('.').pop() || ''

  // Plain text / Markdown / CSV / JSON
  if (['txt', 'md', 'markdown', 'json', 'csv', 'rtf'].includes(ext) || file.type.startsWith('text/')) {
    try {
      const text = await file.text()
      if (text.trim() && text.trim().length > 10) {
        return text.trim()
      }
    } catch {}
  }

  return ''
}

