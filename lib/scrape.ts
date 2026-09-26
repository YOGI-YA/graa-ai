import axios from 'axios'
import * as cheerio from 'cheerio'
import { getLanguage } from './languages'
import { verifyAndSelectBestVideo, VideoCandidateInfo } from './groq'
import { logger } from './logger'

// 100% free, no API keys: DuckDuckGo HTML for web search, YouTube results page +
// oEmbed for a tutorial video, and a lightweight readability pass for article text.

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'

export interface WebResult {
  title: string
  url: string
  snippet: string
  source: string
}

export interface VideoResult {
  title: string
  url: string
  videoId: string
  thumbnail: string
  channel?: string
}

export interface SearchVideoContext {
  goalTitle?: string
  category?: string
  description?: string
  language?: string
}

export interface GatherSourcesOptions {
  goalTitle?: string
  category?: string
  description?: string
  language?: string
}

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

/** DuckDuckGo redirects results through /l/?uddg=… — unwrap to the real URL. */
function unwrapDuckUrl(href: string): string {
  try {
    if (href.startsWith('//')) href = `https:${href}`
    const u = new URL(href, 'https://duckduckgo.com')
    const uddg = u.searchParams.get('uddg')
    return uddg ? decodeURIComponent(uddg) : href
  } catch {
    return href
  }
}

export async function searchWeb(query: string, limit = 5): Promise<WebResult[]> {
  try {
    const res = await axios.get('https://html.duckduckgo.com/html/', {
      params: { q: query },
      headers: { 'User-Agent': UA, 'Accept-Language': 'en-US,en;q=0.9' },
      timeout: 12000,
    })

    const $ = cheerio.load(res.data as string)
    const results: WebResult[] = []

    $('.result').each((_, el) => {
      if (results.length >= limit) return
      const anchor = $(el).find('a.result__a').first()
      const title = anchor.text().trim()
      const rawHref = anchor.attr('href') || ''
      const url = unwrapDuckUrl(rawHref)
      if (!title || !url || !url.startsWith('http')) return
      const snippet = $(el).find('.result__snippet').first().text().trim()
      results.push({ title, url, snippet, source: hostnameOf(url) })
    })

    return results
  } catch (error) {
    logger.error('SCRAPE_WEB', 'searchWeb failed for query', { query, error: String(error) })
    return []
  }
}

/** Fetch a page and extract clean, readable text (truncated to maxChars). */
export async function fetchReadable(url: string, maxChars = 3500): Promise<string> {
  try {
    const res = await axios.get(url, {
      headers: { 'User-Agent': UA, 'Accept-Language': 'en-US,en;q=0.9' },
      timeout: 12000,
      maxContentLength: 5_000_000,
      responseType: 'text',
    })

    const $ = cheerio.load(res.data as string)
    $('script, style, nav, header, footer, noscript, iframe, svg, form, aside').remove()

    const main = $('main').text() || $('article').text() || $('body').text()
    const text = main.replace(/\s+/g, ' ').trim()
    return text.slice(0, maxChars)
  } catch (error) {
    logger.warn('SCRAPE_DOC', 'fetchReadable failed for url', { url, error: String(error) })
    return ''
  }
}

const STOPWORDS = new Set([
  'the', 'a', 'an', 'to', 'of', 'in', 'on', 'for', 'and', 'with', 'how', 'your', 'you',
  'learn', 'tutorial', 'guide', 'course', 'day', 'video', 'watch', 'lecture', 'full',
  'का', 'की', 'के', 'में', 'पर', 'और', 'से', 'को', 'है', 'हैं', 'क्या', 'कैसे', 'एक'
])

function extractKeywords(text: string): string[] {
  // Support Unicode letters & numbers across scripts (Devanagari, Tamil, Latin, etc.)
  const words = text.toLowerCase().match(/[\p{L}\p{N}]+/gu) || []
  return words.filter(w => w.length > 2 && !STOPWORDS.has(w))
}

interface RawCandidate {
  videoId: string
  title: string
  durationSec: number
  views: number
  channel?: string
}

function parseDuration(text?: string): number {
  if (!text) return 0
  const parts = text.split(':').map(Number)
  if (parts.some(isNaN)) return 0
  return parts.reduce((acc, n) => acc * 60 + n, 0)
}

/**
 * Scrape raw candidate videos from YouTube search results for a given query.
 */
async function fetchYouTubeCandidates(query: string, maxResults = 10): Promise<RawCandidate[]> {
  try {
    const res = await axios.get('https://www.youtube.com/results', {
      params: { search_query: query, sp: 'EgIQAQ%3D%3D' }, // Video only
      headers: { 'User-Agent': UA, 'Accept-Language': 'en-US,en;q=0.9' },
      timeout: 12000,
      responseType: 'text',
    })
    const html = res.data as string

    // Pull videoRenderer blocks: id + title + (lengthText) + (viewCount).
    const re = /"videoId":"([a-zA-Z0-9_-]{11})"[\s\S]{0,900}?"title":\{"runs":\[\{"text":"([^"]+)"[\s\S]{0,600}?(?:"lengthText":\{[^}]*?"simpleText":"([0-9:]+)")?[\s\S]{0,400}?(?:"viewCountText":\{[^}]*?"simpleText":"([^"]*)")?/g

    const seen = new Set<string>()
    const candidates: RawCandidate[] = []
    let m: RegExpExecArray | null
    while ((m = re.exec(html)) && candidates.length < maxResults) {
      const [, videoId, rawTitle, lengthText, viewsText] = m
      if (seen.has(videoId)) continue
      seen.add(videoId)
      candidates.push({
        videoId,
        title: rawTitle.replace(/\\u0026/g, '&').replace(/\\"/g, '"'),
        durationSec: parseDuration(lengthText),
        views: viewsText ? parseInt(viewsText.replace(/[^0-9]/g, ''), 10) || 0 : 0,
      })
    }

    if (candidates.length === 0) {
      // Fallback simpler regex
      const simpleRe = /"videoId":"([a-zA-Z0-9_-]{11})"[\s\S]{0,600}?"title":\{"runs":\[\{"text":"([^"]+)"/g
      let sm: RegExpExecArray | null
      while ((sm = simpleRe.exec(html)) && candidates.length < maxResults) {
        const [, videoId, rawTitle] = sm
        if (seen.has(videoId)) continue
        seen.add(videoId)
        candidates.push({
          videoId,
          title: rawTitle.replace(/\\u0026/g, '&').replace(/\\"/g, '"'),
          durationSec: 0,
          views: 0,
        })
      }
    }

    return candidates
  } catch (error) {
    logger.warn('SCRAPE_YT', 'fetchYouTubeCandidates failed for query', { query, error: String(error) })
    return []
  }
}


/**
 * Identify known off-topic clash words when studying Technology/Programming topics.
 * e.g., Cloud Computing != Weather clouds / UPSC geography rainfall / IAS lectures.
 */
function isKnownClash(category: string, goalTitle: string, videoTitle: string): boolean {
  const combined = `${category} ${goalTitle}`.toLowerCase()
  const vt = videoTitle.toLowerCase()

  const isTechOrCS = /cloud|programming|coding|software|web|data|devops|aws|azure|database|python|javascript|java|react/i.test(combined)
  if (isTechOrCS) {
    // Clashes with UPSC / Geography / Atmosphere / Rainfall / Biology
    if (/\b(upsc|ias|geography|ncert|rainfall|rainfalls|monsoon|cumulus|stratus|types of rain|atmosphere|civil services|gk in hindi)\b/i.test(vt)) {
      return true
    }
  }
  return false
}

/**
 * Intelligent YouTube tutorial finder with:
 * 1. Contextual multi-query generation (including technical and localized queries)
 * 2. Multi-candidate harvesting
 * 3. AI verification, comparison & disambiguation (rejecting off-topic / geography / clickbait videos)
 * 4. Resilient heuristic fallback with domain penalty filtering
 */
export async function searchYouTube(
  topic: string,
  context: SearchVideoContext = {}
): Promise<VideoResult | null> {
  const { goalTitle = '', category = '', description = '', language = 'en' } = context
  const lang = getLanguage(language)

  // 1. Build targeted search queries to capture both high-precision localized and technical results
  const queries: string[] = []
  
  if (goalTitle && goalTitle.trim() && !topic.toLowerCase().includes(goalTitle.toLowerCase())) {
    queries.push(`${goalTitle} ${topic} tutorial`)
  } else {
    queries.push(`${topic} ${category || 'tutorial'}`.trim())
  }

  if (language && language !== 'en') {
    queries.push(`${topic} ${goalTitle || ''} tutorial in ${lang.name}`.trim())
  }

  if (category && !queries[0].toLowerCase().includes(category.toLowerCase())) {
    queries.push(`${topic} ${category} tutorial`)
  }

  logger.info('SCRAPE_YT', 'Searching YouTube with contextual queries', { queries, context })

  // 2. Fetch candidates from queries in parallel
  const candidateLists = await Promise.all(queries.map(q => fetchYouTubeCandidates(q, 8)))
  const seenIds = new Set<string>()
  const rawCandidates: RawCandidate[] = []

  for (const list of candidateLists) {
    for (const c of list) {
      if (!seenIds.has(c.videoId)) {
        seenIds.add(c.videoId)
        rawCandidates.push(c)
      }
    }
  }

  if (rawCandidates.length === 0) {
    logger.warn('SCRAPE_YT', 'No YouTube candidates found for queries', { queries })
    return null
  }

  // 3. AI Verification & Comparison (Groq / LLM Judge)
  try {
    const candidateInfos: VideoCandidateInfo[] = rawCandidates.slice(0, 12).map((c, idx) => ({
      id: idx + 1,
      videoId: c.videoId,
      title: c.title,
      durationSec: c.durationSec,
      views: c.views,
      channel: c.channel,
    }))

    const decision = await verifyAndSelectBestVideo(
      goalTitle || topic,
      category,
      topic,
      description,
      candidateInfos,
      language
    )

    if (decision && decision.selectedIndex >= 0 && decision.selectedIndex < rawCandidates.length) {
      const selected = rawCandidates[decision.selectedIndex]
      logger.info('SCRAPE_YT', 'AI Verifier selected video', {
        title: selected.title,
        videoId: selected.videoId,
        reason: decision.reason,
      })

      return await formatVideoResult(selected)
    } else if (decision && decision.selectedIndex === -1) {
      logger.warn('SCRAPE_YT', 'AI Verifier rejected all candidates as off-topic', {
        reason: decision.reason,
        candidatesCount: rawCandidates.length,
      })
      // If AI rejected all due to bad queries, try one strictly English domain-anchored query
      const strictEnglishQuery = `${goalTitle || category || 'tutorial'} ${topic} full tutorial`.trim()
      const strictCandidates = await fetchYouTubeCandidates(strictEnglishQuery, 6)
      const validStrict = strictCandidates.filter(c => !isKnownClash(category, goalTitle, c.title))
      if (validStrict.length > 0) {
        return await formatVideoResult(validStrict[0])
      }
      return null
    }
  } catch (err) {
    logger.warn('SCRAPE_YT', 'AI Video verification fell back to heuristic scoring', { err: String(err) })
  }

  // 4. Heuristic Fallback with Unicode Keywords and Clash Penalties
  const targetKeywords = extractKeywords(`${goalTitle} ${topic} ${category}`)
  const scored = rawCandidates
    .map((c, i) => {
      const titleWords = new Set(extractKeywords(c.title))
      const overlap = targetKeywords.filter(w => titleWords.has(w)).length
      const relevance = targetKeywords.length ? overlap / targetKeywords.length : 0

      // Penalize domain collisions (e.g. UPSC geography clouds vs Cloud computing)
      const isClash = isKnownClash(category, goalTitle, c.title)
      const clashPenalty = isClash ? -10.0 : 0.0

      const dur = c.durationSec
      const durationScore = dur === 0 ? 0.3 : dur < 70 ? -0.5 : dur <= 2400 ? 0.4 : 0.15
      const viewScore = Math.min(0.3, Math.log10(c.views + 1) / 25)
      const positionScore = (12 - i) / 120

      return { c, score: relevance * 2.0 + durationScore + viewScore + positionScore + clashPenalty }
    })
    .sort((a, b) => b.score - a.score)

  const topScored = scored[0]
  if (!topScored || topScored.score < 0) {
    logger.warn('SCRAPE_YT', 'All candidates failed minimum heuristic threshold', { topic })
    return null
  }

  return await formatVideoResult(topScored.c)
}

async function formatVideoResult(candidate: RawCandidate): Promise<VideoResult> {
  const url = `https://www.youtube.com/watch?v=${candidate.videoId}`
  let title = candidate.title
  let channel = candidate.channel

  try {
    const oembed = await axios.get('https://www.youtube.com/oembed', {
      params: { url, format: 'json' },
      timeout: 6000,
    })
    const data = oembed.data as { title?: string; author_name?: string }
    title = data.title || title
    channel = data.author_name || channel
  } catch {
    // best effort oembed
  }

  return {
    videoId: candidate.videoId,
    url,
    title,
    channel,
    thumbnail: `https://i.ytimg.com/vi/${candidate.videoId}/hqdefault.jpg`,
  }
}

export interface DualVideoResult {
  global: VideoResult | null
  localized: VideoResult | null
  activeType?: 'global' | 'localized'
  // Backward compatibility fields
  title: string
  url: string
  videoId: string
  thumbnail: string
  channel?: string
}

/**
 * Find TWO high-quality video options for a topic:
 * 1. Global / English authoritative master tutorial
 * 2. Language-specific tutorial in the learner's chosen language (e.g., Hindi, Telugu, Spanish, etc.)
 */
export async function searchDualYouTube(
  topic: string,
  context: SearchVideoContext = {}
): Promise<DualVideoResult | null> {
  const { goalTitle = '', category = '', description = '', language = 'en' } = context

  // 1. Fetch Global / English Video
  const globalPromise = searchYouTube(topic, {
    goalTitle,
    category,
    description,
    language: 'en',
  })

  // 2. Fetch Language-Specific Video
  const localizedPromise = (async () => {
    if (language && language !== 'en') {
      return searchYouTube(topic, {
        goalTitle,
        category,
        description,
        language,
      })
    }
    // If language is English, find an alternate deep-dive/hands-on project video
    return searchYouTube(`${topic} practical project build`, {
      goalTitle,
      category,
      description,
      language: 'en',
    })
  })()

  const [globalVid, localizedVid] = await Promise.all([globalPromise, localizedPromise])

  if (!globalVid && !localizedVid) return null

  // Pick default active video: if learner has specific regional language and localized exists, prioritize it
  const isRegional = language && language !== 'en'
  const primary = (isRegional && localizedVid) ? localizedVid : (globalVid || localizedVid!)
  const activeType: 'global' | 'localized' = (isRegional && localizedVid) ? 'localized' : 'global'

  return {
    global: globalVid,
    localized: localizedVid,
    activeType,
    title: primary.title,
    url: primary.url,
    videoId: primary.videoId,
    thumbnail: primary.thumbnail,
    channel: primary.channel,
  }
}

export interface ScrapedSources {
  video: DualVideoResult | VideoResult | null
  docs: WebResult[]
  snippets: { source: string; text: string }[]
}

/**
 * Gather raw sources for a day's topic: verified dual video options (global + language-specific),
 * documentation links, and extracted text of the top docs for AI lesson grounding.
 */
export async function gatherSources(
  topic: string,
  options: GatherSourcesOptions = {}
): Promise<ScrapedSources> {
  const { goalTitle = '', category = '', description = '', language = 'en' } = options
  const base = topic.trim()

  // Clean Web search query with disambiguator
  const webQuery = goalTitle && !base.toLowerCase().includes(goalTitle.toLowerCase())
    ? `${goalTitle} ${base} tutorial`
    : `${base} ${category || 'tutorial'}`

  const [docs, video] = await Promise.all([
    searchWeb(`${webQuery.trim()}`, 5),
    searchDualYouTube(base, { goalTitle, category, description, language }),
  ])

  // Read the top 2 docs in parallel to build grounding snippets.
  const topDocs = docs.slice(0, 2)
  const texts = await Promise.all(topDocs.map(d => fetchReadable(d.url)))
  const snippets = topDocs
    .map((d, i) => ({ source: d.source, text: texts[i] }))
    .filter(s => s.text.length > 100)

  return { video, docs, snippets }
}

