import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchContent } from './fetcher'

describe('fetchContent', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('fetches and returns content for valid public URL', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Map([['content-type', 'text/html']]),
      text: async () => '<html><body>Hello</body></html>',
    })
    vi.stubGlobal('fetch', mockFetch)

    const result = await fetchContent('https://example.com')
    expect(result.content).toBe('<html><body>Hello</body></html>')
  })

  it('rejects private IP addresses', async () => {
    await expect(fetchContent('http://192.168.1.1')).rejects.toThrow('Blocked host')
  })

  it('rejects localhost', async () => {
    await expect(fetchContent('http://localhost:3000')).rejects.toThrow('Blocked host')
  })

  it('rejects cloud metadata endpoints', async () => {
    await expect(fetchContent('http://169.254.169.254/latest/meta-data')).rejects.toThrow('Blocked host')
  })

  it('rejects non-HTML content types', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Map([['content-type', 'application/json']]),
      text: async () => '{}',
    })
    vi.stubGlobal('fetch', mockFetch)

    await expect(fetchContent('https://example.com/data.json')).rejects.toThrow('content-type')
  })

  it('enforces request timeout', async () => {
    const mockFetch = vi.fn().mockImplementation(() => new Promise((_, reject) => {
      setTimeout(() => reject(new Error('timeout')), 100)
    }))
    vi.stubGlobal('fetch', mockFetch)

    await expect(fetchContent('https://slow.example.com')).rejects.toThrow()
  })

  it('limits response size', async () => {
    const largeContent = 'x'.repeat(11 * 1024 * 1024)
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Map([['content-type', 'text/html']]),
      text: async () => largeContent,
    })
    vi.stubGlobal('fetch', mockFetch)

    await expect(fetchContent('https://example.com/large')).rejects.toThrow('size')
  })
})
