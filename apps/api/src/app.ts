import express, { type Response } from 'express'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { logger } from '@byewalls/observability'
import { fetchContent, extractMetadata, extractMainContent, sanitizeHtml } from '@byewalls/content-extraction'
import type { ShareStore } from '@byewalls/sharing'
import type { ShareService } from '@byewalls/sharing'
import type { ProcessedResult } from '@byewalls/types'

export interface AppDeps {
  store: ShareStore
  shareService: ShareService
  baseUrl: string
}

const analyzeSchema = z.object({
  url: z.string().url(),
})

const shareSchema = z.object({
  resultId: z.string().min(1),
  expiresIn: z.number().int().min(600).max(604_800).default(86_400),
  maxViews: z.number().int().min(1).max(1000).optional(),
})

function setShareHeaders(res: Response) {
  res.set('Cache-Control', 'private, max-age=300')
  res.set('X-Robots-Tag', 'noindex, nofollow, noarchive')
  res.set('Content-Security-Policy', 'default-src \'self\'')
  res.set('Referrer-Policy', 'no-referrer')
  res.set('X-Content-Type-Options', 'nosniff')
}

export function createApp(deps: AppDeps) {
  const app = express()
  app.use(express.json())

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' })
  })

  app.post('/api/analyze', async (req, res) => {
    const parsed = analyzeSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ code: 'INVALID_URL', message: 'A valid URL is required' })
      return
    }

    try {
      const fetched = await fetchContent(parsed.data.url)
      const metadata = extractMetadata(fetched.content)
      const rawContent = extractMainContent(fetched.content)
      const sanitized = sanitizeHtml(rawContent)

      const result: ProcessedResult = {
        id: randomUUID(),
        url: fetched.url,
        title: metadata.title,
        author: metadata.author,
        publishedAt: metadata.publishedAt,
        content: sanitized,
        processedAt: new Date(),
      }
      await deps.store.saveResult(result)

      res.json({
        resultId: result.id,
        url: result.url,
        title: result.title,
        author: result.author,
        publishedAt: result.publishedAt,
        content: result.content,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      logger.warn('URL processing failed', { error: message })
      res.status(400).json({ code: 'PROCESSING_ERROR', message })
    }
  })

  app.post('/api/share', async (req, res) => {
    const parsed = shareSchema.safeParse(req.body)
    if (!parsed.success) {
      setShareHeaders(res)
      res.status(400).json({ code: 'INVALID_SHARE_REQUEST', message: 'A valid resultId, expiresIn and maxViews are required' })
      return
    }

    try {
      const { token, expiresAt } = await deps.shareService.createShare(parsed.data)
      setShareHeaders(res)
      res.json({ shareUrl: `${deps.baseUrl}/share/${token}`, expiresAt: expiresAt.toISOString() })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      logger.warn('Share creation failed', { error: message })
      setShareHeaders(res)
      if (message === 'RESULT_NOT_FOUND') {
        res.status(404).json({ code: 'RESULT_NOT_FOUND', message: 'The result could not be found.' })
        return
      }
      res.status(400).json({ code: 'SHARE_CREATION_ERROR', message })
    }
  })

  app.get('/api/share/:token', async (req, res) => {
    const view = await deps.shareService.resolveShare(req.params.token)
    setShareHeaders(res)
    if (!view) {
      res.status(404).json({ code: 'SHARE_LINK_UNAVAILABLE', message: 'This link is no longer available.' })
      return
    }
    res.json({
      share: {
        id: view.share.id,
        expiresAt: view.share.expiresAt.toISOString(),
        createdAt: view.share.createdAt.toISOString(),
        viewCount: view.share.viewCount,
        maxViews: view.share.maxViews,
      },
      result: view.result,
    })
  })

  app.delete('/api/share/:shareId', async (req, res) => {
    setShareHeaders(res)
    const record = await deps.store.findShareById(req.params.shareId)
    if (!record) {
      res.status(404).json({ code: 'SHARE_LINK_UNAVAILABLE', message: 'This link is no longer available.' })
      return
    }
    await deps.shareService.revokeShare(record.id)
    res.status(204).end()
  })

  return app
}