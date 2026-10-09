import express, { type Response, type Request, type NextFunction } from 'express'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { logger } from '@byewalls/observability'
import { fetchContent, extractContent } from '@byewalls/content-extraction'
import type { ShareStore } from '@byewalls/sharing'
import type { ShareService } from '@byewalls/sharing'
import type { ProcessedResult } from '@byewalls/types'
import type { RateLimiter } from '@byewalls/security'

export interface AppDeps {
  store: ShareStore
  shareService: ShareService
  baseUrl: string
  rateLimiter?: RateLimiter
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

const ANALYZE_RATE_LIMIT = { limit: 30, windowMs: 60_000 }
const SHARE_RATE_LIMIT = { limit: 60, windowMs: 60_000 }
const SHARE_READ_RATE_LIMIT = { limit: 120, windowMs: 60_000 }

function createRateLimitMiddleware(rateLimiter: RateLimiter, options: { limit: number; windowMs: number }) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip ?? 'unknown'
    const result = await rateLimiter.checkLimit(key, options.limit, options.windowMs)
    res.set('X-RateLimit-Limit', String(options.limit))
    res.set('X-RateLimit-Remaining', String(result.remaining))
    res.set('X-RateLimit-Reset', String(Math.ceil(result.resetAt / 1000)))
    if (!result.allowed) {
      res.set('Retry-After', String(Math.ceil((result.resetAt - Date.now()) / 1000)))
      res.status(429).json({ code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests, please try again later' })
      return
    }
    next()
  }
}

export function createApp(deps: AppDeps) {
  const app = express()
  app.use(express.json())

  let rateLimiter: RateLimiter | undefined = deps.rateLimiter
  const getRateLimiter = async () => {
    if (!rateLimiter) {
      const { createRateLimiter } = await import('@byewalls/security')
      rateLimiter = createRateLimiter()
    }
    return rateLimiter
  }

  const withRateLimit = (options: { limit: number; windowMs: number }) => async (req: Request, res: Response, next: NextFunction) => {
    const limiter = await getRateLimiter()
    return createRateLimitMiddleware(limiter, options)(req, res, next)
  }

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' })
  })

  app.post('/api/analyze', withRateLimit(ANALYZE_RATE_LIMIT), async (req, res) => {
    const parsed = analyzeSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ code: 'INVALID_URL', message: 'A valid URL is required' })
      return
    }

    try {
      const fetched = await fetchContent(parsed.data.url)
      const extracted = extractContent(fetched.content)

      const result: ProcessedResult = {
        id: randomUUID(),
        url: fetched.url,
        title: extracted.title,
        author: extracted.author,
        publishedAt: extracted.publishedAt,
        content: extracted.content,
        processedAt: new Date().toISOString(),
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

  app.post('/api/share', withRateLimit(SHARE_RATE_LIMIT), async (req, res) => {
    const parsed = shareSchema.safeParse(req.body)
    if (!parsed.success) {
      setShareHeaders(res)
      res.status(400).json({ code: 'INVALID_SHARE_REQUEST', message: 'A valid resultId, expiresIn and maxViews are required' })
      return
    }

    try {
      const { token, expiresAt } = await deps.shareService.createShare(parsed.data)
      setShareHeaders(res)
      res.json({ shareUrl: `${deps.baseUrl}/share/${token}`, expiresAt })
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

  app.get('/api/share/:token', withRateLimit(SHARE_READ_RATE_LIMIT), async (req, res) => {
    const token = Array.isArray(req.params.token) ? req.params.token[0] : req.params.token
    const view = await deps.shareService.resolveShare(token)
    setShareHeaders(res)
    if (!view) {
      res.status(404).json({ code: 'SHARE_LINK_UNAVAILABLE', message: 'This link is no longer available.' })
      return
    }
    res.json({
      share: {
        id: view.share.id,
        expiresAt: view.share.expiresAt,
        createdAt: view.share.createdAt,
        viewCount: view.share.viewCount,
        maxViews: view.share.maxViews,
      },
      result: view.result,
    })
  })

  app.delete('/api/share/:shareId', withRateLimit(SHARE_RATE_LIMIT), async (req, res) => {
    setShareHeaders(res)
    const shareId = Array.isArray(req.params.shareId) ? req.params.shareId[0] : req.params.shareId
    const record = await deps.store.findShareById(shareId)
    if (!record) {
      res.status(404).json({ code: 'SHARE_LINK_UNAVAILABLE', message: 'This link is no longer available.' })
      return
    }
    await deps.shareService.revokeShare(record.id)
    res.status(204).end()
  })

  return app
}