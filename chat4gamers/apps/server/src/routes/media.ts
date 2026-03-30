import { Hono } from 'hono'
import { db } from '../db/index.js'
import { eq } from 'drizzle-orm'
import { media, members, users } from '../db/schema.js'
import { writeFile } from 'fs/promises'
import { Buffer } from 'buffer'
import { createReadStream } from 'fs'
import { Readable } from 'stream'
import { requireAuth, requireMember } from '../lib/middleware.js'
import type { AppEnv } from '../lib/types.js'

const app = new Hono<AppEnv>()

app.post('/upload', requireAuth, requireMember, async (c) => {
  const user = c.get('user')
  const file = await c.req.formData()
  const image = file.get('file') as File

  const allowed = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']
  if (!allowed.includes(image.type)) throw new Error('Invalid file type')
  if (image.size > 10 * 1024 * 1024) throw new Error('File too large')

  const filename = `${crypto.randomUUID()}.${image.type.split('/')[1]}`
  const path = `./uploads/media/${filename}`

  await writeFile(path, Buffer.from(await image.arrayBuffer()))

  await db.insert(media).values({
    uploaderKey: user.publicKey,
    url: filename,
    mimeType: image.type,
    sizeBytes: image.size,
    context: 'message',
  })

  return c.json({ url: filename })
})

app.get('/uploads/:filename', requireAuth, requireMember, async (c) => {
  const url = c.req.param('filename')

  // Reject anything that doesn't look like a UUID filename to prevent path traversal
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.[a-z]+$/.test(
      url
    )
  ) {
    return c.json({ error: 'Not found' }, 404)
  }

  const mediaRecord = await db.query.media.findFirst({
    where: eq(media.url, url),
  })

  if (!mediaRecord) return c.json({ error: 'Not found' }, 404)

  const stream = createReadStream(`./uploads/media/${url}`)
  return new Response(Readable.toWeb(stream) as ReadableStream)
})

app.get('/users/:publicKey/avatar', requireAuth, async (c) => {
  const publicKey = c.req.param('publicKey')

  const user = db
    .select({ pfp: users.pfp })
    .from(users)
    .where(eq(users.publicKey, publicKey))
    .get()

  if (!user) return c.json({ error: 'User not found' }, 404)

  return c.json({ pfp: user.pfp ?? null })
})

app.get('/users/:publicKey', requireAuth, async (c) => {
  const publicKey = c.req.param('publicKey')

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
