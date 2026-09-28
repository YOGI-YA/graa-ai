import { SyllabusUnit } from '../types.js'

/**
 * Strips common PDF pagination noise, header artifacts, and excess whitespace.
 */
export function cleanAcademicText(text: string): string {
  if (!text) return ''

  return text
    // Remove page numbering: "Page 1 of 12", "Pg. 3", "- 4 -"
    .replace(/\b(?:page|pg)\.?\s*\d+\s*(?:of|\/)\s*\d+\b/gi, '')
    .replace(/^\s*[-—–]\s*\d+\s*[-—–]\s*$/gm, '')
    // Remove isolated single-character lines often produced by PDF font glitches
    .replace(/^\s*[^a-zA-Z0-9\s]\s*$/gm, '')
    // Normalize consecutive spaces and tabs
    .replace(/[ \t]+/g, ' ')
    // Normalize line breaks
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/**
 * Heuristically parses syllabus text to discover course units, modules, chapters, and subtopics.
 */
export function extractUnitsAndTopics(text: string): SyllabusUnit[] {
  if (!text || text.length < 50) return []

  const units: SyllabusUnit[] = []
  
  // RegEx pattern matching Unit 1, Module 2, Chapter III, SECTION A, Week 4, etc.
  const unitPattern = /(?:^|\n)(?:unit|module|chapter|section|part|week)\s+([0-9ivxlcdm]+|[a-z])[\s:\.\-—–]+([^\n]+)/gi
  const matches: { index: number; end: number; unitNum: string; title: string }[] = []

  let match: RegExpExecArray | null
  while ((match = unitPattern.exec(text)) !== null) {
    matches.push({
      index: match.index,
      end: unitPattern.lastIndex,
      unitNum: match[1].trim(),
      title: match[2].trim(),
    })
  }

  for (let i = 0; i < matches.length; i++) {
    const current = matches[i]
    const nextStart = i + 1 < matches.length ? matches[i + 1].index : text.length
    const unitBody = text.slice(current.end, nextStart).trim()

    // Extract bullet points / subtopics from the body
    const rawLines = unitBody
      .split('\n')
      .map(line => line.replace(/^[\s•\*\-–—\d\.\)]+/, '').trim())
      .filter(line => line.length >= 3 && line.length <= 150)

    const topics = rawLines.slice(0, 15)

    units.push({
      unit: `Unit ${current.unitNum}: ${current.title}`,
      title: current.title,
      topics: topics.length > 0 ? topics : ['Core concepts and applications'],
      bodySnippet: unitBody.slice(0, 800),
    })
  }

  return units
}

/**
 * Builds a structured, high-density syllabus summary for LLM prompt context.
 */
export function buildCondensedOutline(units: SyllabusUnit[]): string {
  if (!units || units.length === 0) return ''

  return units
    .map(u => {
      const topicStr = u.topics.slice(0, 8).join(', ')
      return `• ${u.unit}\n  Topics: ${topicStr}`
    })
    .join('\n\n')
}
