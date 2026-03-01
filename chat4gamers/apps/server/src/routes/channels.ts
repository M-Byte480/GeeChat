import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { db } from '../db/index.js'
import { channels } from '../db/schema.js'
import { broadcast } from '../ws.js'

const router = new Hono()

router.get('/channels', async (c) => {
  const rows = await db.select().from(channels)
  return c.json(rows)
})

router.post('/channels', async (c) => {
  const { name, type } = await c.req.json()
  const id = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  if (!id || !name || !['text', 'voice'].includes(type)) {
    return c.json({ error: 'Invalid channel data' }, 400)
  }
  const existing = await db.select({ id: channels.id }).from(channels).where(eq(channels.id, id))
  if (existing.length > 0) return c.json({ error: 'Channel already exists' }, 409)

  const newChannel = { id, name: name.trim(), type }
  await db.insert(channels).values(newChannel)
  broadcast(JSON.stringify({ type: 'CHANNEL_CREATED', channel: newChannel }))
  return c.json(newChannel)
})

export default router
