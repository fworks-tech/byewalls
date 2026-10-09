import type { Snapshot } from '@byewalls/types'

export interface ArchiveProvider {
  findSnapshots(input: {
    url: string
    from?: Date
    to?: Date
  }): Promise<Snapshot[]>
}

export { ArchivePhProvider } from './providers/archive-ph'
