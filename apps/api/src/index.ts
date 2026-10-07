import express from 'express'
import { config } from '@byewalls/config'
import { logger } from '@byewalls/observability'

const app = express()
app.use(express.json())

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.listen(config.port, () => {
  logger.info('API server started', { port: config.port })
})
