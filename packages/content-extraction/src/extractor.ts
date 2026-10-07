export interface PageMetadata {
  title?: string
  author?: string
  publishedAt?: string
}

export function extractMetadata(html: string): PageMetadata {
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  const authorMatch = html.match(/<meta[^>]+name=["']author["'][^>]+content=["']([^"']+)["']/i)
  const dateMatch = html.match(/<meta[^>]+property=["']article:published_time["'][^>]+content=["']([^"']+)["']/i)

  return {
    title: titleMatch?.[1]?.trim() || undefined,
    author: authorMatch?.[1]?.trim() || undefined,
    publishedAt: dateMatch?.[1]?.trim() || undefined,
  }
}

export function extractMainContent(html: string): string {
  if (!html.trim()) return ''

  const articleMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i)
  if (articleMatch?.[1]) return articleMatch[1].trim()

  const mainMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i)
  if (mainMatch?.[1]) return mainMatch[1].trim()

  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
  if (bodyMatch?.[1]) return bodyMatch[1].trim()

  return html.trim()
}

const DANGEROUS_TAGS = /<(script|iframe|object|embed|form|style|link|meta|head)[^>]*>[\s\S]*?<\/\1>/gi
const DANGEROUS_SELF_CLOSING = /<(script|iframe|object|embed|form|style|link|meta|head)[^>]*\/>/gi
const EVENT_HANDLERS = /\son\w+\s*=\s*["'][^"']*["']/gi
const JAVASCRIPT_URLS = /href\s*=\s*["']javascript:[^"']*["']/gi
const STYLE_ATTRIBUTES = /\sstyle\s*=\s*["'][^"']*["']/gi

export function sanitizeHtml(html: string): string {
  return html
    .replace(DANGEROUS_TAGS, '')
    .replace(DANGEROUS_SELF_CLOSING, '')
    .replace(EVENT_HANDLERS, '')
    .replace(JAVASCRIPT_URLS, '')
    .replace(STYLE_ATTRIBUTES, '')
}
