import { DatabaseSync } from './sqlite'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import type { ProcessedResult } from '@byewalls/types'

export interface ShareRecord {
  id: string
  tokenHash: string
  resultId: string
  expiresAt: string
  revokedAt: string | null
  createdAt: string
  viewCount: number
  maxViews: number | null
}

export interface ShareStore {
  saveResult(result: ProcessedResult): Promise<void>
  findResult(id: string): Promise<ProcessedResult | null>
  deleteResult(id: string): Promise<void>
  isResultReferenced(resultId: string): Promise<boolean>
  saveShare(record: ShareRecord): Promise<void>
  findShareByTokenHash(tokenHash: string): Promise<ShareRecord | null>
  findShareById(id: string): Promise<ShareRecord | null>
  incrementViewCount(id: string): Promise<void>
  revokeShare(id: string): Promise<void>
  deleteShare(id: string): Promise<void>
  listExpiredOrRevoked(beforeIso: string): Promise<ShareRecord[]>
}

interface ResultRow {
  id: string
  url: string
  title: string | null
  author: string | null
  published_at: string | null
  content: string
  summary: string | null
  processed_at: string
}

interface ShareRow {
  id: string
  token_hash: string
  result_id: string
  expires_at: string
  revoked_at: string | null
  created_at: string
  view_count: number
  max_views: number | null
}

export function openShareStore(path: string): SqliteShareStore {
  if (path !== ':memory:') {
    mkdirSync(dirname(path), { recursive: true })
  }
  return new SqliteShareStore(new DatabaseSync(path))
}

export class SqliteShareStore implements ShareStore {
  constructor(private readonly db: DatabaseSync) {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS results (
        id TEXT PRIMARY KEY,
        url TEXT NOT NULL,
        title TEXT,
        author TEXT,
        published_at TEXT,
        content TEXT NOT NULL,
        summary TEXT,
        processed_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS shares (
        id TEXT PRIMARY KEY,
        token_hash TEXT NOT NULL UNIQUE,
        result_id TEXT NOT NULL REFERENCES results(id),
        expires_at TEXT NOT NULL,
        revoked_at TEXT,
        created_at TEXT NOT NULL,
        view_count INTEGER NOT NULL DEFAULT 0,
        max_views INTEGER
      );
    `)
  }

  async saveResult(result: ProcessedResult): Promise<void> {
    this.db.prepare(
      `INSERT INTO results (id, url, title, author, published_at, content, summary, processed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      result.id,
      result.url,
      result.title ?? null,
      result.author ?? null,
      result.publishedAt ?? null,
      result.content,
      result.summary ?? null,
      result.processedAt.toISOString(),
    )
  }

  async findResult(id: string): Promise<ProcessedResult | null> {
    const row = this.db.prepare('SELECT * FROM results WHERE id = ?').get(id) as ResultRow | undefined
    if (!row) return null
    return {
      id: row.id,
      url: row.url,
      title: row.title ?? undefined,
      author: row.author ?? undefined,
      publishedAt: row.published_at ?? undefined,
      content: row.content,
      summary: row.summary ?? undefined,
      processedAt: new Date(row.processed_at),
    }
  }

  async deleteResult(id: string): Promise<void> {
    this.db.prepare('DELETE FROM results WHERE id = ?').run(id)
  }

  async isResultReferenced(resultId: string): Promise<boolean> {
    const row = this.db.prepare('SELECT 1 AS found FROM shares WHERE result_id = ? LIMIT 1').get(resultId) as { found?: number } | undefined
    return row !== undefined
  }

  async saveShare(record: ShareRecord): Promise<void> {
    this.db.prepare(
      `INSERT INTO shares (id, token_hash, result_id, expires_at, revoked_at, created_at, view_count, max_views)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      record.id,
      record.tokenHash,
      record.resultId,
      record.expiresAt,
      record.revokedAt,
      record.createdAt,
      record.viewCount,
      record.maxViews,
    )
  }

  async findShareByTokenHash(tokenHash: string): Promise<ShareRecord | null> {
    const row = this.db.prepare('SELECT * FROM shares WHERE token_hash = ?').get(tokenHash) as ShareRow | undefined
    return row ? mapShareRow(row) : null
  }

  async findShareById(id: string): Promise<ShareRecord | null> {
    const row = this.db.prepare('SELECT * FROM shares WHERE id = ?').get(id) as ShareRow | undefined
    return row ? mapShareRow(row) : null
  }

  async incrementViewCount(id: string): Promise<void> {
    this.db.prepare('UPDATE shares SET view_count = view_count + 1 WHERE id = ?').run(id)
  }

  async revokeShare(id: string): Promise<void> {
    this.db.prepare('UPDATE shares SET revoked_at = ? WHERE id = ?').run(new Date().toISOString(), id)
  }

  async deleteShare(id: string): Promise<void> {
    this.db.prepare('DELETE FROM shares WHERE id = ?').run(id)
  }

  async listExpiredOrRevoked(beforeIso: string): Promise<ShareRecord[]> {
    const rows = this.db.prepare(
      'SELECT * FROM shares WHERE expires_at < ? OR revoked_at IS NOT NULL',
    ).all(beforeIso) as unknown as ShareRow[]
    return rows.map(mapShareRow)
  }
}

function mapShareRow(row: ShareRow): ShareRecord {
  return {
    id: row.id,
    tokenHash: row.token_hash,
    resultId: row.result_id,
    expiresAt: row.expires_at,
    revokedAt: row.revoked_at,
    createdAt: row.created_at,
    viewCount: row.view_count,
    maxViews: row.max_views,
  }
}