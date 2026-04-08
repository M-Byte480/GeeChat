import { Hono } from 'hono'
import { and, asc, desc, eq, gt, isNull, lt } from 'drizzle-orm'
import type { AppEnv } from '../lib/types.js'
import { db } from '../db/index.js'
import { messages } from '../db/schema.js'
import { verifyEd25519 } from '../lib/crypto.js'
import { sanitize } from '../lib/sanitize.js'
import { broadcast } from '../ws.js'
import { requireAdmin, requireAuth, requireMember } from '../lib/middleware.js'

const router = new Hono<AppEnv>()

router.post('/messages', requireAuth, requireMember, async (c) => {
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

router.get('/chat-history', requireAuth, requireMember, async (c) => {
  const channelId = c.req.query('channel')
  const since = c.req.query('since')
  const before = c.req.query('before')
  if (!channelId) return c.json({ error: 'channel is required' }, 400)

  if (since) {
    const result = await db
      .select()
      .from(messages)
      .where(
        and(
          eq(messages.channelId, channelId),
          gt(messages.timestamp, new Date(since)),
          isNull(messages.deletedAt)
        )
      )
      .orderBy(asc(messages.timestamp))
      .limit(100)

    return c.json(result)
  }

  if (before) {
    const result = await db
      .select()
      .from(messages)
      .where(
        and(
          eq(messages.channelId, channelId),
          lt(messages.timestamp, new Date(before)),
          isNull(messages.deletedAt)
        )
      )
      .orderBy(desc(messages.timestamp))
      .limit(50)

    return c.json(result.reverse())
  }

  const result = await db
    .select()
    .from(messages)
    .where(and(eq(messages.channelId, channelId), isNull(messages.deletedAt)))
    .orderBy(desc(messages.timestamp))
    .limit(50)

  return c.json(result.reverse())
})

// ── DELETE /messages/:id ──────────────────────────────────────────────────────
// Soft-delete: sets deleted_at timestamp, broadcasts MESSAGE_DELETED to all clients.
// Admin/owner only.

router.delete('/messages/:id', requireAuth, requireAdmin, async (c) => {
  const id = parseInt(c.req.param('id'), 10)
  if (isNaN(id)) return c.json({ error: 'Invalid message id' }, 400)

  const msg = db.select().from(messages).where(eq(messages.id, id)).get()
  if (!msg) return c.json({ error: 'Message not found' }, 404)
  if (msg.deletedAt) return c.json({ error: 'Already deleted' }, 400)

  db.update(messages)
    .set({ deletedAt: new Date() })
    .where(eq(messages.id, id))
    .run()

  broadcast(JSON.stringify({ type: 'MESSAGE_DELETED', id, channelId: msg.channelId }))

  return c.json({ ok: true })
})

export default router
