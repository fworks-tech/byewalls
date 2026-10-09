import { isBlockedHost, isValidPublicUrl } from '@byewalls/security'
import { fetchWithTimeout } from './fetch-with-timeout'

const MAX_RESPONSE_SIZE = 10 * 1024 * 1024
const REQUEST_TIMEOUT_MS = 10_000
const MAX_REDIRECTS = 10

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

  let currentUrl = url
  let redirectCount = 0

  try {
    while (redirectCount <= MAX_REDIRECTS) {
      const response = await fetchWithTimeout(currentUrl, {
        timeoutMs: REQUEST_TIMEOUT_MS,
        redirect: 'manual',
        headers: { 'User-Agent': 'Byewalls/0.1' },
      })

      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get('location')
        if (!location) {
          throw new Error('Redirect without location header')
        }
        const redirectUrl = new URL(location, currentUrl).toString()
        if (!isValidPublicUrl(redirectUrl)) {
          throw new Error('Redirect to invalid URL: only HTTP and HTTPS protocols are allowed')
        }
        const redirectParsed = new URL(redirectUrl)
        if (isBlockedHost(redirectParsed.hostname)) {
          throw new Error('Redirect to blocked host: private, internal, or metadata endpoints are not allowed')
        }
        currentUrl = redirectUrl
        redirectCount += 1
        continue
      }

      const contentType = response.headers.get('content-type') ?? ''
      if (!contentType.includes('text/html')) {
        throw new Error(`Unsupported content-type: ${contentType}`)
      }

      const text = await response.text()
      if (text.length > MAX_RESPONSE_SIZE) {
        throw new Error('Response exceeds maximum allowed size')
      }

      return { url: currentUrl, content: text, contentType }
    }

    throw new Error('Too many redirects')
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('Request timeout')
    }
    throw err
  }
}
