import type { ArchiveProvider } from '@byewalls/archive'
import type { Snapshot } from '@byewalls/types'

const ARCHIVE_PH_BASE = 'https://archive.ph'

export class ArchivePhProvider implements ArchiveProvider {
  async findSnapshots(input: {
    url: string
    from?: Date
    to?: Date
  }): Promise<Snapshot[]> {
    const { url, from, to } = input

    try {
      const submitUrl = `${ARCHIVE_PH_BASE}/submit/?url=${encodeURIComponent(url)}`
      const response = await fetch(submitUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Byewalls/1.0 (+https://byewalls.app)',
          Accept: 'text/html',
        },
        signal: AbortSignal.timeout(10000),
      })

      if (!response.ok) {
        return []
      }

      const html = await response.text()
      const snapshots = this.parseSnapshots(html, url)

      return snapshots.filter((s) => {
        const ts = new Date(s.timestamp)
        if (from && ts < from) return false
        if (to && ts > to) return false
        return true
      })
    } catch {
      return []
    }
  }

  private parseSnapshots(html: string, _originalUrl: string): Snapshot[] {
    const snapshots: Snapshot[] = []

    const snapshotLinks = html.matchAll(/<a[^>]*href="(\/snapshot\/[^"]+)"[^>]*>([^<]+)<\/a>/g)

    for (const match of snapshotLinks) {
      const [, href, timestampText] = match
      const archivedUrl = `${ARCHIVE_PH_BASE}${href}`

      const timestamp = this.parseTimestamp(timestampText)
      if (timestamp) {
        snapshots.push({
          timestamp,
          archivedUrl,
          status: 200,
        })
      }
    }

    return snapshots
  }

  private parseTimestamp(text: string): string | null {
    const cleaned = text.trim()
    const formats = [
      /^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})$/,
      /^(\d{4}-\d{2}-\d{2})$/,
    ]

    for (const fmt of formats) {
      const match = cleaned.match(fmt)
      if (match) {
        const parsed = new Date(match[1])
        if (!isNaN(parsed.getTime())) {
          return parsed.toISOString()
        }
      }
    }

    return null
  }
}