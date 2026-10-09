export interface ExtractedContent {
  title?: string
  content: string
  author?: string
  publishedAt?: string
}

import { extractMetadata, extractMainContent, sanitizeHtml } from './extractor'

export function extractContent(html: string): ExtractedContent {
  const metadata = extractMetadata(html)
  const rawContent = extractMainContent(html)
  const sanitized = sanitizeHtml(rawContent)

  return {
    title: metadata.title,
    content: sanitized,
    author: metadata.author,
    publishedAt: metadata.publishedAt,
  }
}

export { fetchContent } from './fetcher'
export { extractMetadata, extractMainContent, sanitizeHtml } from './extractor'
export { fetchWithTimeout } from './fetch-with-timeout'
export type { FetchWithTimeoutOptions } from './fetch-with-timeout'
