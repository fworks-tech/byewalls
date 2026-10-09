import { JSDOM } from 'jsdom'
import DOMPurify from 'isomorphic-dompurify'

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

const domPurify = DOMPurify(new JSDOM('').window)

export function sanitizeHtml(html: string): string {
  return domPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 's', 'blockquote', 'code', 'pre',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li',
      'a', 'img',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'div', 'span', 'section', 'article', 'main', 'header', 'footer',
    ],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'id'],
    ALLOW_DATA_ATTR: false,
    RETURN_DOM: false,
    RETURN_DOM_FRAGMENT: false,
    KEEP_CONTENT: true,
  })
}
