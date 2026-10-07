import { notFound } from 'next/navigation'
import { sanitizeHtml } from '@byewalls/content-extraction'
import { config } from '@byewalls/config'

export const dynamic = 'force-dynamic'

export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  let data: { share: { expiresAt: string; viewCount: number }; result: { title?: string; content: string } }
  try {
    const res = await fetch(`${config.apiBaseUrl}/api/share/${token}`, { cache: 'no-store' })
    if (!res.ok) notFound()
    data = await res.json()
  } catch {
    notFound()
  }

  const expiresAt = new Date(data.share.expiresAt).toLocaleDateString()
  return (
    <main>
      <h1>{data.result.title ?? 'Shared result'}</h1>
      <p>Expires {expiresAt} · Viewed {data.share.viewCount} times</p>
      {/* ponytail: regex sanitizer is a coarse filter against mXSS; swap for a DOM-based
          sanitizer before serving shared pages at scale with untrusted content. */}
      <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(data.result.content) }} />
    </main>
  )
}