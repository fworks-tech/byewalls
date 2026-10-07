import { randomUUID } from 'node:crypto'
import type { ProcessedResult } from '@byewalls/types'
import type { ShareStore } from './store'
import { generateToken, hashToken } from './token'

export const DEFAULT_EXPIRES_SECONDS = 86_400

export interface CreateShareOptions {
  resultId: string
  expiresInSeconds?: number
  maxViews?: number
}

export interface ShareView {
  share: {
    id: string
    expiresAt: Date
    createdAt: Date
    viewCount: number
    maxViews?: number
  }
  result: ProcessedResult
}

export class ShareService {
  constructor(
    private readonly store: ShareStore,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async createShare(options: CreateShareOptions): Promise<{ token: string; expiresAt: Date }> {
    const result = await this.store.findResult(options.resultId)
    if (!result) throw new Error('RESULT_NOT_FOUND')

    const now = this.now()
    const token = generateToken()
    const expiresAt = new Date(now.getTime() + (options.expiresInSeconds ?? DEFAULT_EXPIRES_SECONDS) * 1000)

    await this.store.saveShare({
      id: randomUUID(),
      tokenHash: hashToken(token),
      resultId: options.resultId,
      expiresAt: expiresAt.toISOString(),
      revokedAt: null,
      createdAt: now.toISOString(),
      viewCount: 0,
      maxViews: options.maxViews ?? null,
    })

    return { token, expiresAt }
  }

  async resolveShare(token: string): Promise<ShareView | null> {
    const record = await this.store.findShareByTokenHash(hashToken(token))
    if (!record) return null

    const now = this.now()
    if (new Date(record.expiresAt) <= now) return null
    if (record.revokedAt) return null
    if (record.maxViews !== null && record.viewCount >= record.maxViews) return null

    const result = await this.store.findResult(record.resultId)
    if (!result) return null

    // ponytail: check-then-increment can overshoot maxViews by one under concurrency; a
    // transaction with SELECT ... FOR UPDATE fixes it if view limits ever need to be strict.
    await this.store.incrementViewCount(record.id)

    return {
      share: {
        id: record.id,
        expiresAt: new Date(record.expiresAt),
        createdAt: new Date(record.createdAt),
        viewCount: record.viewCount + 1,
        maxViews: record.maxViews ?? undefined,
      },
      result,
    }
  }

  async revokeShare(id: string): Promise<void> {
    await this.store.revokeShare(id)
  }
}

export async function cleanupExpiredShares(
  store: ShareStore,
  now: Date = new Date(),
): Promise<{ deletedShares: number; deletedResults: number }> {
  const expired = await store.listExpiredOrRevoked(now.toISOString())
  let deletedShares = 0
  let deletedResults = 0

  for (const share of expired) {
    await store.deleteShare(share.id)
    deletedShares += 1
    if (!(await store.isResultReferenced(share.resultId))) {
      const result = await store.findResult(share.resultId)
      if (result) {
        await store.deleteResult(share.resultId)
        deletedResults += 1
      }
    }
  }

  return { deletedShares, deletedResults }
}