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

  const article = extractBalancedElement(html, 'article')
  if (article) return article.trim()

  const main = extractBalancedElement(html, 'main')
  if (main) return main.trim()

  const body = extractBalancedElement(html, 'body')
  if (body) return body.trim()

  return html.trim()
}

function extractBalancedElement(html: string, tag: string): string | undefined {
  const re = new RegExp(`<(\\/?)${tag}\\b`, 'gi')
  let depth = 0
  let innerStart = -1
  let match: RegExpExecArray | null
  while ((match = re.exec(html))) {
    if (match[1]) {
      depth--
      if (depth === 0) return html.slice(innerStart, match.index)
    } else {
      depth++
      if (depth === 1) innerStart = match.index + match[0].length
    }
  }
  return undefined
}

const DANGEROUS_TAGS = /<(script|iframe|object|embed|form|style|link|meta|head)[^>]*>[\s\S]*?<\/\1>/gi
const DANGEROUS_SELF_CLOSING = /<(script|iframe|object|embed|form|style|link|meta|head)[^>]*\/>/gi
const UNCLOSED_OPENING = /<(script|iframe|object|embed|form|style|link|meta|head)\b[^>]*>/gi
const STRAY_CLOSING = /<\/(script|iframe|object|embed|form|style)\s*>/gi
const EVENT_HANDLERS = /\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi
const JAVASCRIPT_URLS = /\bhref\s*=\s*(?:"(?:javascript|vbscript):[^"]*"|'(?:javascript|vbscript):[^']*'|(?:javascript|vbscript):[^\s>]*)/gi
const STYLE_ATTRIBUTES = /\sstyle\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi

export function sanitizeHtml(html: string): string {
  return html
    .replace(DANGEROUS_TAGS, '')
    .replace(DANGEROUS_SELF_CLOSING, '')
    .replace(UNCLOSED_OPENING, '')
    .replace(STRAY_CLOSING, '')
    .replace(EVENT_HANDLERS, '')
    .replace(JAVASCRIPT_URLS, '')
    .replace(STYLE_ATTRIBUTES, '')
}
