import { openShareStore, cleanupExpiredShares } from '@byewalls/sharing'
import { config } from '@byewalls/config'
import { logger } from '@byewalls/observability'

async function main() {
  const store = openShareStore(config.dbPath)
  const { deletedShares, deletedResults } = await cleanupExpiredShares(store)
  logger.info('Share cleanup finished', { deletedShares, deletedResults })
}

main().catch((err) => {
  logger.error('Share cleanup failed', { error: err instanceof Error ? err.message : String(err) })
  process.exit(1)
})