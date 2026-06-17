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

/** Find the first relevant YouTube tutorial for a query (no API key). */
export async function searchYouTube(query: string): Promise<VideoResult | null> {
  try {
    const res = await axios.get('https://www.youtube.com/results', {
      params: { search_query: query },
      headers: { 'User-Agent': UA, 'Accept-Language': 'en-US,en;q=0.9' },
      timeout: 12000,
      responseType: 'text',
    })

    const match = (res.data as string).match(/"videoId":"([a-zA-Z0-9_-]{11})"/)
    if (!match) return null
    const videoId = match[1]
    const url = `https://www.youtube.com/watch?v=${videoId}`

    let title = query
    let channel: string | undefined
    try {
      const oembed = await axios.get('https://www.youtube.com/oembed', {
        params: { url, format: 'json' },
        timeout: 8000,
      })
      const data = oembed.data as { title?: string; author_name?: string }
      title = data.title || title
      channel = data.author_name
    } catch {
      // oEmbed is best-effort; the embed still works with just the id
    }

    return {
      videoId,
      url,
      title,
      channel,
      thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    }
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
 */
export async function gatherSources(topic: string, context: string): Promise<ScrapedSources> {
  const docQuery = `${topic} ${context} tutorial guide`.trim()
  const videoQuery = `${topic} ${context} tutorial`.trim()

  const [docs, video] = await Promise.all([
    searchWeb(docQuery, 5),
    searchYouTube(videoQuery),
  ])

  // Read the top 2 docs in parallel to build grounding snippets.
  const topDocs = docs.slice(0, 2)
  const texts = await Promise.all(topDocs.map(d => fetchReadable(d.url)))
  const snippets = topDocs
    .map((d, i) => ({ source: d.source, text: texts[i] }))
    .filter(s => s.text.length > 100)

  return { video, docs, snippets }
}
