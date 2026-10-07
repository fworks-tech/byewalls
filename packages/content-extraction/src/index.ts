export interface ExtractedContent {
  title?: string
  content: string
  author?: string
  publishedAt?: string
}

export function extractContent(_html: string): ExtractedContent {
  return { content: '' }
}

export { fetchContent } from './fetcher'
