import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { createApp, type AppDeps } from './app'
import { openShareStore, ShareService } from '@byewalls/sharing'
import type { ProcessedResult } from '@byewalls/types'

const result: ProcessedResult = {
  id: 'result-1',
  url: 'https://example.org',
  title: 'Example title',
  author: 'Jane Doe',
  publishedAt: '2026-10-01T00:00:00.000Z',
  content: '<p>Hello world</p>',
  processedAt: new Date('2026-10-07T00:00:00.000Z'),
}

let deps: AppDeps
let baseUrl: string
let server: Server

describe('share API', () => {
  beforeAll(async () => {
    const store = openShareStore(':memory:')
    await store.saveResult(result)
    deps = { store, shareService: new ShareService(store), baseUrl: 'http://localhost:3000' }
    server = createApp(deps).listen(0)
    await new Promise<void>((resolve) => server.once('listening', resolve))
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  })

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())))
  })

  it('creates a share link for a saved result', async () => {
    const res = await fetch(`${baseUrl}/api/share`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ resultId: 'result-1' }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.shareUrl).toMatch(/^http:\/\/localhost:3000\/share\/[A-Za-z0-9_-]+$/)
    expect(typeof body.expiresAt).toBe('string')
  })

  it('resolves a token to the result and sets security headers', async () => {
    const createRes = await fetch(`${baseUrl}/api/share`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ resultId: 'result-1' }),
    })
    const { shareUrl } = await createRes.json()
    const token = shareUrl.split('/').pop()

    const res = await fetch(`${baseUrl}/api/share/${token}`)
    expect(res.status).toBe(200)
    expect(res.headers.get('cache-control')).toBe('private, max-age=300')
    expect(res.headers.get('x-robots-tag')).toContain('noindex')
    expect(res.headers.get('content-security-policy')).toBe('default-src \'self\'')
    const body = await res.json()
    expect(body.result.id).toBe('result-1')
    expect(body.result.content).toBe('<p>Hello world</p>')
  })

  it('returns 404 for an unknown or expired token', async () => {
    const res = await fetch(`${baseUrl}/api/share/nonexistent-token`)
    expect(res.status).toBe(404)
    expect((await res.json()).code).toBe('SHARE_LINK_UNAVAILABLE')
  })

  it('honors maxViews and then makes the link unavailable', async () => {
    const createRes = await fetch(`${baseUrl}/api/share`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ resultId: 'result-1', maxViews: 1 }),
    })
    const { shareUrl } = await createRes.json()
    const token = shareUrl.split('/').pop()

    expect((await fetch(`${baseUrl}/api/share/${token}`)).status).toBe(200)
    const second = await fetch(`${baseUrl}/api/share/${token}`)
    expect(second.status).toBe(404)
    expect((await second.json()).code).toBe('SHARE_LINK_UNAVAILABLE')
  })

  it('revokes a link on DELETE and it becomes unavailable', async () => {
    const createRes = await fetch(`${baseUrl}/api/share`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ resultId: 'result-1' }),
    })
    const { shareUrl } = await createRes.json()
    const token = shareUrl.split('/').pop()
    const getRes = await fetch(`${baseUrl}/api/share/${token}`)
    const { share } = await getRes.json()

    const delRes = await fetch(`${baseUrl}/api/share/${share.id}`, { method: 'DELETE' })
    expect(delRes.status).toBe(204)

    const after = await fetch(`${baseUrl}/api/share/${token}`)
    expect(after.status).toBe(404)
  })

  it('returns 404 when deleting an unknown share', async () => {
    const res = await fetch(`${baseUrl}/api/share/does-not-exist`, { method: 'DELETE' })
    expect(res.status).toBe(404)
    expect((await res.json()).code).toBe('SHARE_LINK_UNAVAILABLE')
  })

  it('rejects invalid share requests', async () => {
    const res = await fetch(`${baseUrl}/api/share`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ resultId: 'result-1', expiresIn: 5 }),
    })
    expect(res.status).toBe(400)
    expect((await res.json()).code).toBe('INVALID_SHARE_REQUEST')
  })

  it('returns 404 when sharing an unknown result', async () => {
    const res = await fetch(`${baseUrl}/api/share`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ resultId: 'missing' }),
    })
    expect(res.status).toBe(404)
    expect((await res.json()).code).toBe('RESULT_NOT_FOUND')
  })
})