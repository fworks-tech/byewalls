import { describe, it, expect } from 'vitest'
import { DatabaseSync } from './sqlite'
import { SqliteShareStore } from './store'
import type { ProcessedResult } from '@byewalls/types'

const result: ProcessedResult = {
  id: 'result_1',
  url: 'https://example.com/article',
  title: 'Example article',
  content: '<p>Hello</p>',
  processedAt: '2026-10-07T00:00:00.000Z',
}

describe('SqliteShareStore', () => {
  it('initializes the schema idempotently', () => {
    const db = new DatabaseSync(':memory:')
    new SqliteShareStore(db)
    new SqliteShareStore(db)
  })

  it('saves and retrieves a result', async () => {
    const store = new SqliteShareStore(new DatabaseSync(':memory:'))
    await store.saveResult(result)
    const found = await store.findResult('result_1')
    expect(found).toEqual(result)
  })

  it('returns null for a missing result', async () => {
    const store = new SqliteShareStore(new DatabaseSync(':memory:'))
    expect(await store.findResult('missing')).toBeNull()
  })

  it('deletes a result', async () => {
    const store = new SqliteShareStore(new DatabaseSync(':memory:'))
    await store.saveResult(result)
    await store.deleteResult('result_1')
    expect(await store.findResult('result_1')).toBeNull()
  })

  it('saves and finds a share by token hash', async () => {
    const store = new SqliteShareStore(new DatabaseSync(':memory:'))
    await store.saveResult(result)
    await store.saveShare({
      id: 'share_1',
      tokenHash: 'abc123',
      resultId: 'result_1',
      expiresAt: '2026-10-08T00:00:00.000Z',
      revokedAt: null,
      createdAt: '2026-10-07T00:00:00.000Z',
      viewCount: 0,
      maxViews: null,
    })
    const found = await store.findShareByTokenHash('abc123')
    expect(found?.id).toBe('share_1')
  })

  it('increments the view count', async () => {
    const store = new SqliteShareStore(new DatabaseSync(':memory:'))
    await store.saveResult(result)
    await store.saveShare({
      id: 'share_1',
      tokenHash: 'abc123',
      resultId: 'result_1',
      expiresAt: '2026-10-08T00:00:00.000Z',
      revokedAt: null,
      createdAt: '2026-10-07T00:00:00.000Z',
      viewCount: 0,
      maxViews: 5,
    })
    await store.incrementViewCount('share_1')
    expect((await store.findShareById('share_1'))?.viewCount).toBe(1)
  })

  it('revokes a share', async () => {
    const store = new SqliteShareStore(new DatabaseSync(':memory:'))
    await store.saveResult(result)
    await store.saveShare({
      id: 'share_1',
      tokenHash: 'abc123',
      resultId: 'result_1',
      expiresAt: '2026-10-08T00:00:00.000Z',
      revokedAt: null,
      createdAt: '2026-10-07T00:00:00.000Z',
      viewCount: 0,
      maxViews: null,
    })
    await store.revokeShare('share_1')
    expect((await store.findShareById('share_1'))?.revokedAt).toBeTruthy()
  })

  it('lists expired and revoked shares', async () => {
    const store = new SqliteShareStore(new DatabaseSync(':memory:'))
    await store.saveResult(result)
    await store.saveShare({
      id: 'expired',
      tokenHash: 'hash-expired',
      resultId: 'result_1',
      expiresAt: '2026-10-01T00:00:00.000Z',
      revokedAt: null,
      createdAt: '2026-10-07T00:00:00.000Z',
      viewCount: 0,
      maxViews: null,
    })
    await store.saveShare({
      id: 'revoked',
      tokenHash: 'hash-revoked',
      resultId: 'result_1',
      expiresAt: '2026-10-20T00:00:00.000Z',
      revokedAt: '2026-10-06T00:00:00.000Z',
      createdAt: '2026-10-07T00:00:00.000Z',
      viewCount: 0,
      maxViews: null,
    })
    await store.saveShare({
      id: 'active',
      tokenHash: 'hash-active',
      resultId: 'result_1',
      expiresAt: '2026-10-08T00:00:00.000Z',
      revokedAt: null,
      createdAt: '2026-10-07T00:00:00.000Z',
      viewCount: 0,
      maxViews: null,
    })
    const listed = await store.listExpiredOrRevoked('2026-10-07T12:00:00.000Z')
    const ids = listed.map((s) => s.id).sort()
    expect(ids).toEqual(['expired', 'revoked'])
  })

  it('reports whether a result is still referenced', async () => {
    const store = new SqliteShareStore(new DatabaseSync(':memory:'))
    await store.saveResult(result)
    expect(await store.isResultReferenced('result_1')).toBe(false)
    await store.saveShare({
      id: 'share_1',
      tokenHash: 'abc123',
      resultId: 'result_1',
      expiresAt: '2026-10-08T00:00:00.000Z',
      revokedAt: null,
      createdAt: '2026-10-07T00:00:00.000Z',
      viewCount: 0,
      maxViews: null,
    })
    expect(await store.isResultReferenced('result_1')).toBe(true)
  })
})