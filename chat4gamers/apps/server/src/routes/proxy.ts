import { Hono } from 'hono'
import {requireAuth} from "../lib/middleware.js";

const router = new Hono()

function isBlockedHost(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, '')
  if (['localhost', '127.0.0.1', '0.0.0.0', '::1', '169.254.169.254', '100.100.100.200', 'metadata.google.internal'].includes(h)) return true
  if (/^10\./.test(h) || /^192\.168\./.test(h) || /^172\.(1[6-9]|2\d|3[01])\./.test(h)) return true
  return false
}

router.get('/proxy-image',
  requireAuth,
  async (c) => {
  const url = c.req.query('url')
  if (!url) return c.json({ error: 'Missing url' }, 400)

  let parsed: URL
  try { parsed = new URL(url) } catch { return c.json({ error: 'Invalid URL' }, 400) }

  if (!['http:', 'https:'].includes(parsed.protocol)) return c.json({ error: 'Invalid protocol' }, 400)
  if (isBlockedHost(parsed.hostname)) return c.json({ error: 'Blocked host' }, 403)

  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(10_000),
      headers: { 'User-Agent': 'GeeChat-Proxy/1.0' },
    })
    const contentType = res.headers.get('content-type') ?? ''
    if (!contentType.startsWith('image/') && !contentType.startsWith('video/')) {
      return c.json({ error: 'Not media' }, 415)
    }
    const buf = await res.arrayBuffer()
    if (buf.byteLength > 10 * 1024 * 1024) return c.json({ error: 'Too large' }, 413)
    return new Response(buf, {
      headers: { 'Content-Type': contentType, 'Cache-Control': 'public, max-age=3600' },
    })
  } catch {
    return c.json({ error: 'Proxy failed' }, 502)
  }
})

export default router
