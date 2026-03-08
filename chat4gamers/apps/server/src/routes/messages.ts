import { Hono } from 'hono'
import { eq, desc } from 'drizzle-orm'
import { db } from '../db/index.js'
import { messages, users } from '../db/schema.js'
import { verifyEd25519 } from '../lib/crypto.js'
import { sanitize } from '../lib/sanitize.js'
import { broadcast } from '../ws.js'

const router = new Hono()

router.post('/messages', async (c) => {
  const body = await c.req.json()
  try {
    // Client sends roomId — maps to channelId in the schema
    const { roomId, userId, senderName, signature, timestamp } = body
    const content = sanitize(body.content ?? '')
    if (!content) return c.json({ error: 'Empty message' }, 400)
    if (!userId || !senderName || !signature || !timestamp) {
      return c.json({ error: 'Missing required fields' }, 400)
    }

    const ts = new Date(timestamp).getTime()
    if (isNaN(ts) || Math.abs(Date.now() - ts) > 5 * 60 * 1000) {
      return c.json({ error: 'Timestamp out of range' }, 400)
    }

    const payload = Buffer.from(`${roomId}:${timestamp}:${content}`, 'utf8')
    if (!verifyEd25519(userId, payload, signature)) {
      return c.json({ error: 'Invalid signature' }, 401)
    }

    const [newMessage] = await db.insert(messages).values({
      channelId: roomId,
      senderId: userId,
      content,
      timestamp: new Date(),
      signature,
    }).returning()

    // Return shape the client expects: roomId + senderName
    const result = { ...newMessage, roomId: newMessage.channelId, senderName: senderName.trim().slice(0, 64) }
    broadcast(JSON.stringify({ type: 'NEW_MESSAGE', channelId: roomId, ...result }))
    return c.json(result)
  } catch (err: any) {
    console.error('POST /messages error:', err.stack || err)
    return c.json({ error: err.message }, 500)
  }
})

router.get('/chat-history', async (c) => {
  const channel = c.req.query('channel')
  if (!channel) return c.json({ error: 'channel query param required' }, 400)
  try {
    const history = await db
      .select({
        id:         messages.id,
        roomId:     messages.channelId,   // alias so client receives roomId
        channelId:  messages.channelId,
        senderId:   messages.senderId,
        senderName: users.username,       // join users to get name
        content:    messages.content,
        timestamp:  messages.timestamp,
        signature:  messages.signature,
      })
      .from(messages)
      .innerJoin(users, eq(messages.senderId, users.publicKey))
      .where(eq(messages.channelId, channel))
      .orderBy(desc(messages.timestamp))
      .limit(50)
    return c.json(history.reverse())
  } catch (err) {
    console.error('GET /chat-history error:', err)
    return c.json({ error: 'Failed to fetch history' }, 500)
  }
})

export default router
