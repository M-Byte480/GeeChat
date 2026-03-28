import { Hono } from 'hono'
import { and, asc, desc, eq, gt } from 'drizzle-orm'
import { db } from '../db/index.js'
import { messages } from '../db/schema.js'
import { verifyEd25519 } from '../lib/crypto.js'
import { sanitize } from '../lib/sanitize.js'
import { broadcast } from '../ws.js'
import { requireAuth } from '../lib/middleware.js'

const router = new Hono()

router.post('/messages', requireAuth, async (c) => {
  const body = await c.req.json()
  console.log('[Messages] body:', body)
  try {
    // Client sends roomId — maps to channelId in the schema
    const { roomId, userId, senderName, signature, timestamp, tempId } = body

    const rawContent = body.content ?? ''
    const content = sanitize(rawContent)
    console.log('[Messages] raw:', rawContent)
    console.log('[Messages] sanitized:', content)

    if (!content) return c.json({ error: 'Empty message' }, 400)

    if (!userId || !senderName || !signature || !timestamp) {
      return c.json({ error: 'Missing required fields' }, 400)
    }

    const ts = new Date(timestamp).getTime()
    if (isNaN(ts) || Math.abs(Date.now() - ts) > 5 * 60 * 1000) {
      return c.json({ error: 'Timestamp out of range' }, 400)
    }

    const payload = Buffer.from(`${roomId}:${timestamp}:${rawContent}`, 'utf8')
    if (!verifyEd25519(userId, payload, signature)) {
      return c.json({ error: 'Invalid signature' }, 401)
    }

    const [newMessage] = await db
      .insert(messages)
      .values({
        channelId: roomId,
        senderId: userId,
        content,
        timestamp: new Date(),
        signature,
      })
      .returning()

    // Return shape the client expects: roomId + senderName
    const result = {
      ...newMessage,
      roomId: newMessage.channelId,
      senderName: senderName.trim().slice(0, 64),
      tempId,
    }
    broadcast(JSON.stringify({ type: 'NEW_MESSAGE', ...result }))
    return c.json(result)
  } catch (err) {
    console.error('POST /messages error:', err)
    return c.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      500
    )
  }
})

router.get('/chat-history', requireAuth, async (c) => {
  const channelId = c.req.query('channel')
  const since = c.req.query('since')
  if (!channelId) return c.json({ error: 'channel is required' }, 400)

  if (since) {
    const result = await db
      .select()
      .from(messages)
      .where(
        and(
          eq(messages.channelId, channelId),
          gt(messages.timestamp, new Date(since))
        )
      )
      .orderBy(asc(messages.timestamp))
      .limit(100)

    return c.json(result)
  }

  const query = db
    .select()
    .from(messages)
    .where(eq(messages.channelId, channelId))
    .orderBy(desc(messages.timestamp))
    .limit(100)

  const result = await query
  return c.json(result.reverse())
})

export default router
