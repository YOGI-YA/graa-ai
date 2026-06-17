import axios from 'axios'
import * as cheerio from 'cheerio'

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
    console.error('searchWeb failed', query, error instanceof Error ? error.message : error)
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
    console.error('fetchReadable failed', url, error instanceof Error ? error.message : error)
    return ''
  }
}

const STOPWORDS = new Set(['the', 'a', 'an', 'to', 'of', 'in', 'on', 'for', 'and', 'with', 'how', 'your', 'you', 'learn', 'tutorial', 'guide', 'course', 'day'])

function keywords(text: string): string[] {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length > 2 && !STOPWORDS.has(w))
}

interface Candidate { videoId: string; title: string; durationSec: number; views: number }

function parseDuration(text?: string): number {
  if (!text) return 0
  const parts = text.split(':').map(Number)
  if (parts.some(isNaN)) return 0
  return parts.reduce((acc, n) => acc * 60 + n, 0)
}

/**
 * Find the BEST relevant YouTube tutorial: parse several candidates from the
 * results page, then rank by title relevance + sane duration (skips Shorts/live
 * and clickbait-short clips), preferring solid tutorials.
 */
export async function searchYouTube(query: string): Promise<VideoResult | null> {
  try {
    const res = await axios.get('https://www.youtube.com/results', {
      params: { search_query: query, sp: 'EgIQAQ%3D%3D' }, // sp filter = "Video" only (excludes channels/playlists)
      headers: { 'User-Agent': UA, 'Accept-Language': 'en-US,en;q=0.9' },
      timeout: 12000,
      responseType: 'text',
    })
    const html = res.data as string

    // Pull videoRenderer blocks: id + title + (lengthText) + (viewCount).
    const re = /"videoId":"([a-zA-Z0-9_-]{11})"[\s\S]{0,900}?"title":\{"runs":\[\{"text":"([^"]+)"[\s\S]{0,600}?(?:"lengthText":\{[^}]*?"simpleText":"([0-9:]+)")?[\s\S]{0,400}?(?:"viewCountText":\{[^}]*?"simpleText":"([^"]*)")?/g

    const seen = new Set<string>()
    const candidates: Candidate[] = []
    let m: RegExpExecArray | null
    while ((m = re.exec(html)) && candidates.length < 12) {
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
      const fallback = html.match(/"videoId":"([a-zA-Z0-9_-]{11})"/)
      if (!fallback) return null
      candidates.push({ videoId: fallback[1], title: query, durationSec: 0, views: 0 })
    }

    const want = keywords(query)
    const scored = candidates.map((c, i) => {
      const titleWords = new Set(keywords(c.title))
      const overlap = want.filter(w => titleWords.has(w)).length
      const relevance = want.length ? overlap / want.length : 0
      // Prefer 4–40 min tutorials; penalize Shorts (<70s) and very long.
      const dur = c.durationSec
      const durationScore = dur === 0 ? 0.3 : dur < 70 ? -0.5 : dur <= 2400 ? 0.4 : 0.15
      const viewScore = Math.min(0.3, Math.log10(c.views + 1) / 25)
      const positionScore = (12 - i) / 120 // mild preference for higher results
      return { c, score: relevance * 1.6 + durationScore + viewScore + positionScore }
    }).sort((a, b) => b.score - a.score)

    const best = scored[0].c
    const url = `https://www.youtube.com/watch?v=${best.videoId}`

    let title = best.title
    let channel: string | undefined
    try {
      const oembed = await axios.get('https://www.youtube.com/oembed', { params: { url, format: 'json' }, timeout: 8000 })
      const data = oembed.data as { title?: string; author_name?: string }
      title = data.title || title
      channel = data.author_name
    } catch {
      // best-effort
    }

    return { videoId: best.videoId, url, title, channel, thumbnail: `https://i.ytimg.com/vi/${best.videoId}/hqdefault.jpg` }
  } catch (error) {
    console.error('searchYouTube failed', query, error instanceof Error ? error.message : error)
    return null
  }
}

export interface ScrapedSources {
  video: VideoResult | null
  docs: WebResult[]
  snippets: { source: string; text: string }[]
}

/**
 * Gather raw sources for a day's topic: one video, a few doc links, and the
 * extracted text of the top couple of docs (used to ground the AI lesson).
 *
 * IMPORTANT: search on the SPECIFIC day topic — never the broader goal — or the
 * results drift (e.g. an "Introduction to HTML" day in a MERN goal must not pull
 * MERN-stack content). `subject` is an optional one-word disambiguator, only
 * appended when the topic is too short to stand on its own.
 */
export async function gatherSources(topic: string, subject?: string): Promise<ScrapedSources> {
  const base = topic.trim()
  // Only disambiguate very short/generic topics (e.g. "Variables" → "Variables Python").
  const needsHint = base.split(/\s+/).length <= 2 && subject && !base.toLowerCase().includes(subject.toLowerCase())
  const q = needsHint ? `${base} ${subject}` : base

  const [docs, video] = await Promise.all([
    searchWeb(`${q} tutorial`, 5),
    searchYouTube(`${q} tutorial`),
  ])

  // Read the top 2 docs in parallel to build grounding snippets.
  const topDocs = docs.slice(0, 2)
  const texts = await Promise.all(topDocs.map(d => fetchReadable(d.url)))
  const snippets = topDocs
    .map((d, i) => ({ source: d.source, text: texts[i] }))
    .filter(s => s.text.length > 100)

  return { video, docs, snippets }
}
