import { Hono } from 'hono'
import { db } from '../db/index.js'
import { eq } from 'drizzle-orm'
import { media, members, users } from '../db/schema.js'
import { writeFile } from 'fs/promises'
import { existsSync, createReadStream, mkdirSync } from 'fs'
import { Readable } from 'stream'
import { requireAuth, requireMember } from '../lib/middleware.js'
import type { AppEnv } from '../lib/types.js'
import sharp from 'sharp'

const isProd = process.env.NODE_ENV === 'production'
// Must be inside the Docker volume (./data:/app/data) so uploads survive restarts
const UPLOADS_DIR = isProd ? '/app/data/uploads' : './data/uploads'

mkdirSync(UPLOADS_DIR, { recursive: true })

const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
}

const MAX_SIZE = 20 * 1024 * 1024 // 20 MB

const MIME_FROM_EXT: Record<string, string> = {
  webp: 'image/webp',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  mp4: 'video/mp4',
  webm: 'video/webm',
}

const app = new Hono<AppEnv>()

// ── POST /upload ──────────────────────────────────────────────────────────────
// Accepts a multipart form with a `file` field.
// Static images are compressed to WebP + a 400px thumbnail.
// GIFs and videos are saved as-is (no transcoding).
// Returns { url, thumbUrl } — relative paths. Client prepends serverUrl.

app.post('/upload', requireAuth, requireMember, async (c) => {
  const user = c.get('user')

  const formData = await c.req.formData()
  const file = formData.get('file') as File | null
  if (!file) return c.json({ error: 'No file provided' }, 400)

  const ext = ALLOWED_TYPES[file.type]
  if (!ext) return c.json({ error: 'File type not allowed' }, 415)
  if (file.size > MAX_SIZE) return c.json({ error: 'File too large (max 20 MB)' }, 413)

  const uuid = crypto.randomUUID()
  const isStaticImage = ['image/jpeg', 'image/png', 'image/webp'].includes(file.type)
  const isGif = file.type === 'image/gif'
  const isVideo = file.type.startsWith('video/')

  let outputExt = ext
  let url: string
  let thumbUrl: string
  const inputBuffer = Buffer.from(await file.arrayBuffer())

  if (isStaticImage) {
    // Compress to WebP, max 1920px, and generate a 400px thumbnail
    outputExt = 'webp'
    const [compressed, thumb] = await Promise.all([
      sharp(inputBuffer)
        .resize(1920, 1920, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer(),
      sharp(inputBuffer)
        .resize(400, 400, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 75 })
        .toBuffer(),
    ])
    url = `/uploads/media/${uuid}.webp`
    thumbUrl = `/uploads/media/${uuid}_thumb.webp`
    await Promise.all([
      writeFile(`${UPLOADS_DIR}/${uuid}.webp`, compressed),
      writeFile(`${UPLOADS_DIR}/${uuid}_thumb.webp`, thumb),
    ])
  } else if (isGif) {
    // Preserve GIF as-is; use itself as thumb
    url = `/uploads/media/${uuid}.gif`
    thumbUrl = url
    await writeFile(`${UPLOADS_DIR}/${uuid}.gif`, inputBuffer)
  } else if (isVideo) {
    // Save video as-is; no thumbnail for now
    url = `/uploads/media/${uuid}.${ext}`
    thumbUrl = url
    await writeFile(`${UPLOADS_DIR}/${uuid}.${ext}`, inputBuffer)
  } else {
    return c.json({ error: 'Unsupported type' }, 415)
  }

  await db.insert(media).values({
    uploaderKey: user.publicKey,
    url,
    mimeType: file.type,
    sizeBytes: file.size,
    context: 'message',
  })

  return c.json({ url, thumbUrl })
})

// ── GET /uploads/media/:filename ──────────────────────────────────────────────
// Serves uploaded files. No auth required — UUID filenames are unguessable
// (128-bit entropy). Cache aggressively since content never changes.

app.get('/uploads/media/:filename', requireAuth, requireMember, async (c) => {
  const filename = c.req.param('filename')

  // Strict allowlist: uuid[_thumb].ext — prevents any path traversal
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(_thumb)?\.[a-z0-9]+$/.test(filename)) {
    return c.json({ error: 'Not found' }, 404)
  }

  const filePath = `${UPLOADS_DIR}/${filename}`
  if (!existsSync(filePath)) return c.json({ error: 'Not found' }, 404)

  const ext = filename.split('.').pop() ?? ''
  const mimeType = MIME_FROM_EXT[ext] ?? 'application/octet-stream'

  c.header('Content-Type', mimeType)
  c.header('Cache-Control', 'public, max-age=31536000, immutable')

  const stream = createReadStream(filePath)
  return new Response(Readable.toWeb(stream) as ReadableStream)
})

// ── GET /users/:publicKey/avatar ──────────────────────────────────────────────

app.get('/users/:publicKey/avatar', requireAuth, async (c) => {
  const publicKey = c.req.param('publicKey')
  if (!publicKey) return c.json({ error: 'Not found' }, 404)

  const user = db
    .select({ pfp: users.pfp })
    .from(users)
    .where(eq(users.publicKey, publicKey))
    .get()

  if (!user) return c.json({ error: 'User not found' }, 404)
  return c.json({ pfp: user.pfp ?? null })
})

// ── GET /users/:publicKey ─────────────────────────────────────────────────────

app.get('/users/:publicKey', requireAuth, async (c) => {
  const publicKey = c.req.param('publicKey')
  if (!publicKey) return c.json({ error: 'Not found' }, 404)

  const result = db
    .select({
      publicKey: users.publicKey,
      username: users.username,
      pfp: users.pfp,
      nickname: members.nickname,
      role: members.role,
      status: members.status,
    })
    .from(users)
    .innerJoin(members, eq(members.userPublicKey, users.publicKey))
    .where(eq(users.publicKey, publicKey))
    .get()

  if (!result) return c.json({ error: 'User not found' }, 404)
  return c.json(result)
})

export default app
