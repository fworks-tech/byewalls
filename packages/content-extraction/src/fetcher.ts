import { isBlockedHost, isValidPublicUrl } from '@byewalls/security'

const MAX_RESPONSE_SIZE = 10 * 1024 * 1024
const REQUEST_TIMEOUT_MS = 10_000

export interface FetchedContent {
  url: string
  content: string
  contentType: string
}

export async function fetchContent(url: string): Promise<FetchedContent> {
  if (!isValidPublicUrl(url)) {
    throw new Error('Invalid URL: only HTTP and HTTPS protocols are allowed')
  }

  const parsed = new URL(url)
  if (isBlockedHost(parsed.hostname)) {
    throw new Error('Blocked host: private, internal, or metadata endpoints are not allowed')
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: { 'User-Agent': 'Byewalls/0.1' },
    })

    const contentType = response.headers.get('content-type') ?? ''
    if (!contentType.includes('text/html')) {
      throw new Error(`Unsupported content-type: ${contentType}`)
    }

    const text = await response.text()
    if (text.length > MAX_RESPONSE_SIZE) {
      throw new Error('Response exceeds maximum allowed size')
    }

    return { url, content: text, contentType }
  } finally {
    clearTimeout(timeout)
  }
}
