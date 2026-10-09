export interface ProcessedResult {
  id: string
  url: string
  title?: string
  content: string
  author?: string
  publishedAt?: string
  summary?: string
  processedAt: string
}

export interface ApiError {
  code: string
  message: string
  details?: Record<string, unknown>
}

export interface ShareLink {
  id: string
  tokenHash: string
  resultId: string
  expiresAt: string
  revokedAt?: string
  createdAt: string
  viewCount: number
  maxViews?: number
}

export interface Snapshot {
  timestamp: string
  archivedUrl: string
  status: number
}
