import { Hono } from 'hono'
import { and, asc, desc, eq, gt, inArray, isNull, lt } from 'drizzle-orm'
import type { AppEnv } from '../lib/types.js'
import { db } from '../db/index.js'
import { messages, reactions } from '../db/schema.js'
import { verifyEd25519 } from '../lib/crypto.js'
import { sanitize } from '../lib/sanitize.js'
import { broadcast } from '../ws.js'
import { requireAdmin, requireAuth, requireMember } from '../lib/middleware.js'

const router = new Hono<AppEnv>()

// ── helpers ───────────────────────────────────────────────────────────────────

type ReactionRow = { messageId: number; userPublicKey: string; emoji: string }

function groupReactions(rows: ReactionRow[]) {
  const map = new Map<number, Record<string, string[]>>()
  for (const r of rows) {
    if (!map.has(r.messageId)) map.set(r.messageId, {})
    const byEmoji = map.get(r.messageId)!
    if (!byEmoji[r.emoji]) byEmoji[r.emoji] = []
    byEmoji[r.emoji].push(r.userPublicKey)
  }
  return map
}

function attachReactions<T extends { id: number }>(
  rows: T[],
  reactionMap: Map<number, Record<string, string[]>>
) {
  return rows.map((m) => {
    const byEmoji = reactionMap.get(m.id) ?? {}
    return {
      ...m,
      reactions: Object.entries(byEmoji).map(([emoji, users]) => ({
        emoji,
        count: users.length,
        users,
      })),
    }
  })
}

async function withReactions<T extends { id: number }>(rows: T[]) {
  if (rows.length === 0) return rows.map((m) => ({ ...m, reactions: [] }))
  const ids = rows.map((m) => m.id)
  const reactionRows = await db
    .select({ messageId: reactions.messageId, userPublicKey: reactions.userPublicKey, emoji: reactions.emoji })
    .from(reactions)
    .where(inArray(reactions.messageId, ids))
  return attachReactions(rows, groupReactions(reactionRows))
}

// ── POST /messages ────────────────────────────────────────────────────────────

router.post('/messages', requireAuth, requireMember, async (c) => {
  const body = await c.req.json()
  console.log('[Messages] body:', body)
  try {
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

    const result = {
      ...newMessage,
      roomId: newMessage.channelId,
      senderName: senderName.trim().slice(0, 64),
      reactions: [],
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

// ── GET /chat-history ─────────────────────────────────────────────────────────

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

    return c.json(await withReactions(result))
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

    return c.json(await withReactions(result.reverse()))
  }

  const result = await db
    .select()
    .from(messages)
    .where(and(eq(messages.channelId, channelId), isNull(messages.deletedAt)))
    .orderBy(desc(messages.timestamp))
    .limit(50)

  return c.json(await withReactions(result.reverse()))
})

// ── POST /messages/:id/react ──────────────────────────────────────────────────
// Toggle a reaction. Adds if not present, removes if already reacted.

router.post('/messages/:id/react', requireAuth, requireMember, async (c) => {
  const user = c.get('user')
  const messageId = parseInt(c.req.param('id') ?? '', 10)
  if (isNaN(messageId)) return c.json({ error: 'Invalid message id' }, 400)

  const { emoji } = await c.req.json() as { emoji: string }
  if (!emoji || typeof emoji !== 'string' || emoji.length > 8) {
    return c.json({ error: 'Invalid emoji' }, 400)
  }

  const msg = db.select({ id: messages.id, channelId: messages.channelId })
    .from(messages)
    .where(and(eq(messages.id, messageId), isNull(messages.deletedAt)))
    .get()
  if (!msg) return c.json({ error: 'Message not found' }, 404)

  const existing = db.select()
    .from(reactions)
    .where(
      and(
        eq(reactions.messageId, messageId),
        eq(reactions.userPublicKey, user.publicKey),
        eq(reactions.emoji, emoji)
      )
    )
    .get()

  let action: 'add' | 'remove'
  if (existing) {
    db.delete(reactions)
      .where(
        and(
          eq(reactions.messageId, messageId),
          eq(reactions.userPublicKey, user.publicKey),
          eq(reactions.emoji, emoji)
        )
      )
      .run()
    action = 'remove'
  } else {
    db.insert(reactions)
      .values({ messageId, userPublicKey: user.publicKey, emoji })
      .run()
    action = 'add'
  }

  broadcast(JSON.stringify({
    type: 'REACTION_UPDATED',
    messageId,
    channelId: msg.channelId,
    emoji,
    userPublicKey: user.publicKey,
    action,
  }))

  return c.json({ ok: true, action })
})

// ── DELETE /messages/:id ──────────────────────────────────────────────────────
// Soft-delete: sets deleted_at timestamp, broadcasts MESSAGE_DELETED to all clients.
// Admin/owner only.

router.delete('/messages/:id', requireAuth, requireAdmin, async (c) => {
  const id = parseInt(c.req.param('id') ?? '', 10)
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
