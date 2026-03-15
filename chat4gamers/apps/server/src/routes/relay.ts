import { Hono } from 'hono'
import { eq, and, or, desc } from 'drizzle-orm'
import { db } from '../db/index.js'
import { directMessages } from '../db/schema.js'
import { verifyEd25519 } from '../lib/crypto.js'
import { sanitize } from '../lib/sanitize.js'
import { sendToUser } from '../ws.js'

const router = new Hono()

router.post('/relay/dm', async (c) => {
  try {
    const body = await c.req.json()
    const { senderId, recipientId, signature, timestamp } = body
    const content = sanitize(body.content ?? '')

    if (!senderId || !recipientId || !signature || !timestamp || !content) {
      return c.json({ error: 'Missing required fields' }, 400)
    }

    const ts = new Date(timestamp).getTime()
    if (isNaN(ts) || Math.abs(Date.now() - ts) > 5 * 60 * 1000) {
      return c.json({ error: 'Timestamp out of range' }, 400)
    }

    const payload = Buffer.from(`dm:${recipientId}:${timestamp}:${content}`, 'utf8')
    if (!verifyEd25519(senderId, payload, signature)) {
      return c.json({ error: 'Invalid signature' }, 401)
    }

    const [dm] = await db.insert(directMessages).values({
      senderId,
      recipientId,
      content,
      timestamp: new Date(timestamp),
      signature,
    }).returning()

    const envelope = JSON.stringify({ type: 'DIRECT_MESSAGE', ...dm })
    sendToUser(recipientId, envelope)
    sendToUser(senderId, envelope) // echo to sender's other sessions

    return c.json(dm)
  } catch (err: any) {
    console.error('POST /relay/dm error:', err.stack || err)
    return c.json({ error: err.message }, 500)
  }
})

router.get('/relay/dm-history', async (c) => {
  const me = c.req.query('me')
  const other = c.req.query('with')
  if (!me || !other) return c.json({ error: 'me and with query params required' }, 400)

  try {
    const history = await db
      .select()
      .from(directMessages)
      .where(
        or(
          and(eq(directMessages.senderId, me), eq(directMessages.recipientId, other)),
          and(eq(directMessages.senderId, other), eq(directMessages.recipientId, me)),
        )
      )
      .orderBy(desc(directMessages.timestamp))
      .limit(50)

    return c.json(history.reverse())
  } catch (err) {
    console.error('GET /relay/dm-history error:', err)
    return c.json({ error: 'Failed to fetch DM history' }, 500)
  }
})

export default router
