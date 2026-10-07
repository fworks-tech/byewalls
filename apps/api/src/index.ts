import express from 'express'
import { z } from 'zod'
import { config } from '@byewalls/config'
import { logger } from '@byewalls/observability'
import { fetchContent, extractMetadata, extractMainContent, sanitizeHtml } from '@byewalls/content-extraction'

const app = express()
app.use(express.json())

const analyzeSchema = z.object({
  url: z.string().url(),
})

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

    res.json({
      url: fetched.url,
      title: metadata.title,
      author: metadata.author,
      publishedAt: metadata.publishedAt,
      content: sanitized,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    logger.warn('URL processing failed', { error: message })
    res.status(400).json({ code: 'PROCESSING_ERROR', message })
  }
})

app.listen(config.port, () => {
  logger.info('API server started', { port: config.port })
})
