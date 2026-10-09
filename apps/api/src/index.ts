import { createApp } from './app'
import { openShareStore, ShareService } from '@byewalls/sharing'
import { config } from '@byewalls/config'
import { logger } from '@byewalls/observability'

const store = openShareStore(config.dbPath)

const app = createApp({
  store,
  shareService: new ShareService(store),
  baseUrl: config.publicBaseUrl,
})

app.listen(config.port, () => {
  logger.info('API server started', { port: config.port })
})