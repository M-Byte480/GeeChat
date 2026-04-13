import { Hono } from 'hono'
import { requireAuth, requireMember } from '../lib/middleware.js'
import type { AppEnv } from '../lib/types.js'

// ── Klipy API config ──────────────────────────────────────────────────────────
// app_key goes in the URL path; customer_id (user's public key) per request.
const KLIPY_BASE = 'https://api.klipy.com/api/v1'
const APP_KEY = process.env.KLIPY_API_KEY ?? ''

const router = new Hono<AppEnv>()

// ── Normalised GIF shape returned to our frontend ─────────────────────────────
interface GifResult {
  id: string
  altText: string
  gifUrl: string      // tinygif — small preview shown in picker + inline chat
  gifFullUrl: string  // full GIF sent in the message
  gifWidth: number
  gifHeight: number
}

interface GifPage {
  results: GifResult[]
  hasMore: boolean
}

// Maps one Klipy result object to our GifResult shape.
// Response shape: { id, title, file: { hd, md, sm, xs: { gif: { url, width, height } } } }
function mapGif(item: Record<string, unknown>): GifResult {
  const file = (item.file ?? {}) as Record<string, unknown>
  const sm   = (file.sm ?? {}) as Record<string, unknown>
  const md   = (file.md ?? {}) as Record<string, unknown>

  const smGif = (sm.gif ?? {}) as Record<string, unknown>
  const mdGif = (md.gif ?? sm.gif ?? {}) as Record<string, unknown>

  return {
    id:         String(item.id ?? ''),
    altText:    String(item.title ?? ''),
    gifUrl:     String(smGif.url ?? mdGif.url ?? ''),   // sm for picker thumbnails
    gifFullUrl: String(mdGif.url ?? smGif.url ?? ''),   // md for in-chat display
    gifWidth:   Number(mdGif.width ?? smGif.width ?? 200),
    gifHeight:  Number(mdGif.height ?? smGif.height ?? 150),
  }
}

function klipyHeaders() {
  return { 'Content-Type': 'application/json' }
}

// ── GET /api/gifs/enabled ────────────────────────────────────────────────────
router.get('/api/gifs/enabled', requireAuth, async (c) => {
  return c.json({ enabled: !!APP_KEY })
})

// ── GET /api/gifs/trending?page=1&per_page=20 ────────────────────────────────
router.get('/api/gifs/trending', requireAuth, requireMember, async (c) => {
  if (!APP_KEY) return c.json({ error: 'GIF search not configured' }, 501)

  const user = c.get('user')
  const perPage = Math.min(Number(c.req.query('per_page') ?? 20), 50)
  const page = Math.max(1, Number(c.req.query('page') ?? 1))

  const params = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
    customer_id: user.publicKey,
  })

  const res  = await fetch(`${KLIPY_BASE}/${APP_KEY}/gifs/trending?${params}`, { headers: klipyHeaders() })
  const data = await res.json() as Record<string, unknown>
  const inner = (data.data ?? {}) as Record<string, unknown>
  const items = Array.isArray(inner.data) ? inner.data as Record<string, unknown>[] : []
  const hasMore = typeof inner.has_next === 'boolean' ? inner.has_next : items.length >= perPage

  return c.json({ results: items.map(mapGif), hasMore } satisfies GifPage)
})

// ── GET /api/gifs/search?q=excited&page=1&per_page=20 ────────────────────────
router.get('/api/gifs/search', requireAuth, requireMember, async (c) => {
  if (!APP_KEY) return c.json({ error: 'GIF search not configured' }, 501)

  const user = c.get('user')
  const q = c.req.query('q') ?? ''
  const perPage = Math.min(Number(c.req.query('per_page') ?? 20), 50)
  const page = Math.max(1, Number(c.req.query('page') ?? 1))

  if (!q.trim()) return c.json({ results: [], hasMore: false })

  const params = new URLSearchParams({
    q,
    page: String(page),
    per_page: String(perPage),
    customer_id: user.publicKey,
  })

  const res  = await fetch(`${KLIPY_BASE}/${APP_KEY}/gifs/search?${params}`, { headers: klipyHeaders() })
  const data = await res.json() as Record<string, unknown>
  const inner = (data.data ?? {}) as Record<string, unknown>
  const items = Array.isArray(inner.data) ? inner.data as Record<string, unknown>[] : []
  const hasMore = typeof inner.has_next === 'boolean' ? inner.has_next : items.length >= perPage

  return c.json({ results: items.map(mapGif), hasMore } satisfies GifPage)
})

// ── GET /api/gifs/categories ──────────────────────────────────────────────────
router.get('/api/gifs/categories', requireAuth, requireMember, async (c) => {
  if (!APP_KEY) return c.json({ error: 'GIF search not configured' }, 501)

  const user = c.get('user')
  const params = new URLSearchParams({ customer_id: user.publicKey })

  const res  = await fetch(`${KLIPY_BASE}/${APP_KEY}/categories?${params}`, { headers: klipyHeaders() })
  const data = await res.json() as Record<string, unknown>

  const cats = (data.result ?? data.data ?? data.results ?? data.categories ?? []) as Record<string, unknown>[]
  return c.json({
    categories: cats.map((c) => ({
      name:     String(c.name ?? c.searchterm ?? c.tag ?? ''),
      imageUrl: String(c.image ?? c.gif ?? ''),
    })).filter((c) => c.name),
  })
})

export default router
