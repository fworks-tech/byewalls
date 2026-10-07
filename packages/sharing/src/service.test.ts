import { describe, it, expect } from 'vitest'
import { DatabaseSync } from './sqlite'
import { SqliteShareStore } from './store'
import { ShareService, cleanupExpiredShares } from './service'
import { hashToken } from './token'
import type { ProcessedResult } from '@byewalls/types'

const result: ProcessedResult = {
  id: 'result_1',
  url: 'https://example.com/article',
  title: 'Example article',
  content: '<p>Hello</p>',
  processedAt: new Date('2026-10-07T00:00:00.000Z'),
}

function serviceAt(iso: string): { store: SqliteShareStore; service: ShareService } {
  const store = new SqliteShareStore(new DatabaseSync(':memory:'))
  return { store, service: new ShareService(store, () => new Date(iso)) }
}

describe('ShareService.createShare', () => {
  it('stores only the token hash, never the plain token', async () => {
    const store = new SqliteShareStore(new DatabaseSync(':memory:'))
    await store.saveResult(result)
    const service = new ShareService(store, () => new Date('2026-10-07T00:00:00.000Z'))
    const created = await service.createShare({ resultId: 'result_1' })

    const record = await store.findShareByTokenHash(hashToken(created.token))
    expect(record).toBeTruthy()
    expect(record?.tokenHash).not.toBe(created.token)
  })

  it('defaults to a 24h expiry', async () => {
    const { store, service } = serviceAt('2026-10-07T00:00:00.000Z')
    await store.saveResult(result)
    const created = await service.createShare({ resultId: 'result_1' })
    expect(created.expiresAt.toISOString()).toBe('2026-10-08T00:00:00.000Z')
  })

  it('honors a custom expiresIn', async () => {
    const { store, service } = serviceAt('2026-10-07T00:00:00.000Z')
    await store.saveResult(result)
    const created = await service.createShare({ resultId: 'result_1', expiresInSeconds: 600 })
    expect(created.expiresAt.toISOString()).toBe('2026-10-07T00:10:00.000Z')
  })

  it('rejects shares for a missing result', async () => {
    const { service } = serviceAt('2026-10-07T00:00:00.000Z')
    await expect(service.createShare({ resultId: 'missing' })).rejects.toThrow('RESULT_NOT_FOUND')
  })
})

describe('ShareService.resolveShare', () => {
  it('returns the share and its result, and counts the view', async () => {
    const store = new SqliteShareStore(new DatabaseSync(':memory:'))
    await store.saveResult(result)
    const service = new ShareService(store, () => new Date('2026-10-07T00:00:00.000Z'))
    const created = await service.createShare({ resultId: 'result_1' })

    const view = await service.resolveShare(created.token)
    expect(view).not.toBeNull()
    expect(view?.result.title).toBe('Example article')
    expect(view?.share.viewCount).toBe(1)
  })

  it('returns null for an unknown token', async () => {
    const { service } = serviceAt('2026-10-07T00:00:00.000Z')
    expect(await service.resolveShare('unknown-token')).toBeNull()
  })

  it('returns null after expiry', async () => {
    const store = new SqliteShareStore(new DatabaseSync(':memory:'))
    await store.saveResult(result)
    const service = new ShareService(store, () => new Date('2026-10-07T00:00:00.000Z'))
    const created = await service.createShare({ resultId: 'result_1', expiresInSeconds: 600 })

    const later = new ShareService(store, () => new Date('2026-10-07T00:11:00.000Z'))
    expect(await later.resolveShare(created.token)).toBeNull()
  })

  it('returns null after revocation', async () => {
    const store = new SqliteShareStore(new DatabaseSync(':memory:'))
    await store.saveResult(result)
    const service = new ShareService(store, () => new Date('2026-10-07T00:00:00.000Z'))
    const created = await service.createShare({ resultId: 'result_1' })
    const record = await store.findShareByTokenHash(hashToken(created.token))
    await service.revokeShare(record!.id)

    expect(await service.resolveShare(created.token)).toBeNull()
  })

  it('returns null once the view limit is reached', async () => {
    const store = new SqliteShareStore(new DatabaseSync(':memory:'))
    await store.saveResult(result)
    const service = new ShareService(store, () => new Date('2026-10-07T00:00:00.000Z'))
    const created = await service.createShare({ resultId: 'result_1', maxViews: 2 })

    expect((await service.resolveShare(created.token))?.share.viewCount).toBe(1)
    expect((await service.resolveShare(created.token))?.share.viewCount).toBe(2)
    expect(await service.resolveShare(created.token)).toBeNull()
  })
})

describe('cleanupExpiredShares', () => {
  it('deletes expired and revoked shares and orphaned results', async () => {
    const store = new SqliteShareStore(new DatabaseSync(':memory:'))
    await store.saveResult(result)

    const service = new ShareService(store, () => new Date('2026-10-07T00:00:00.000Z'))
    const shortLived = await service.createShare({ resultId: 'result_1', expiresInSeconds: 600 })

    const others: ProcessedResult = { ...result, id: 'result_2' }
    await store.saveResult(others)
    await store.saveShare({
      id: 'revoked_share',
      tokenHash: 'hash-revoked',
      resultId: 'result_2',
      expiresAt: '2026-10-08T00:00:00.000Z',
      revokedAt: '2026-10-06T00:00:00.000Z',
      createdAt: '2026-10-07T00:00:00.000Z',
      viewCount: 0,
      maxViews: null,
    })

    const run = await cleanupExpiredShares(store, new Date('2026-10-07T00:11:00.000Z'))
    expect(run.deletedShares).toBe(2)
    expect(run.deletedResults).toBe(2)

    expect(await store.findShareByTokenHash(hashToken(shortLived.token))).toBeNull()
    expect(await store.findResult('result_1')).toBeNull()
  })

  it('keeps results still referenced by an active share', async () => {
    const store = new SqliteShareStore(new DatabaseSync(':memory:'))
    await store.saveResult(result)
    const service = new ShareService(store, () => new Date('2026-10-07T00:00:00.000Z'))
    await service.createShare({ resultId: 'result_1', expiresInSeconds: 86400 })

    await service.createShare({ resultId: 'result_1', expiresInSeconds: 600 }).catch(() => {})
    const run = await cleanupExpiredShares(store, new Date('2026-10-07T00:11:00.000Z'))
    expect(run.deletedShares).toBe(1)
    expect(run.deletedResults).toBe(0)
    expect(await store.findResult('result_1')).not.toBeNull()
  })

  it('is idempotent', async () => {
    const store = new SqliteShareStore(new DatabaseSync(':memory:'))
    await store.saveResult(result)
    const service = new ShareService(store, () => new Date('2026-10-07T00:00:00.000Z'))
    await service.createShare({ resultId: 'result_1', expiresInSeconds: 600 })

    await cleanupExpiredShares(store, new Date('2026-10-07T00:11:00.000Z'))
    const second = await cleanupExpiredShares(store, new Date('2026-10-07T00:11:00.000Z'))
    expect(second.deletedShares).toBe(0)
    expect(second.deletedResults).toBe(0)
  })
})