import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import type { AppEnv } from '../lib/types.js'
import { requireAdmin, requireAuth } from '../lib/middleware.js'
import { db } from '../db/index.js'
import { activities, history, members } from '../db/schema.js'
import { sendToUser } from '../ws.js'

const router = new Hono<AppEnv>()

router.use('/admin/*', requireAuth, requireAdmin)

// ── helpers ───────────────────────────────────────────────────────────────────

async function getActivityId(name: string): Promise<string> {
  const row = db.select({ id: activities.id }).from(activities).where(eq(activities.name, name)).get()
  if (!row) throw new Error(`Unknown activity: ${name}`)
  return row.id
}

async function logHistory(
  activityName: string,
  actorPublicKey: string,
  targetPublicKey: string,
  reason: string | null,
  metadata: Record<string, unknown> | null = null
) {
  const activityId = await getActivityId(activityName)
  db.insert(history).values({
    activityId,
    actorPublicKey,
    targetPublicKey,
    reason,
    metadata: metadata ? JSON.stringify(metadata) : null,
    timestamp: new Date(),
  }).run()
}

function getTargetMember(targetPublicKey: string) {
  return db.select().from(members).where(eq(members.userPublicKey, targetPublicKey)).get()
}

// ── POST /admin/kick ──────────────────────────────────────────────────────────

router.post('/admin/kick', async (c) => {
  const actor = c.get('user')
  const body = await c.req.json() as { targetPublicKey: string; reason?: string }
  const { targetPublicKey, reason } = body

  if (!targetPublicKey) return c.json({ error: 'targetPublicKey required' }, 400)
  if (targetPublicKey === actor.publicKey) return c.json({ error: 'Cannot kick yourself' }, 400)

  const target = getTargetMember(targetPublicKey)
  if (!target) return c.json({ error: 'Member not found' }, 404)
  if (target.status !== 'active') return c.json({ error: 'Member is not active' }, 400)
  if (target.role === 'owner') return c.json({ error: 'Cannot kick the server owner' }, 403)

  db.update(members)
    .set({ status: 'inactive' })
    .where(eq(members.userPublicKey, targetPublicKey))
    .run()

  await logHistory('kick', actor.publicKey, targetPublicKey, reason ?? null)

  sendToUser(targetPublicKey, JSON.stringify({ type: 'KICKED', reason: reason ?? null }))

  return c.json({ ok: true })
})

// ── POST /admin/ban ───────────────────────────────────────────────────────────
// Body: { targetPublicKey, reason?, banType: 'permanent'|'duration'|'date', banUntil?: ISO string }
// banUntil is required for 'date' type. For 'duration', the client pre-computes the expiry date.
// A null banExpiresAt means permanent.

router.post('/admin/ban', async (c) => {
  const actor = c.get('user')
  const body = await c.req.json() as {
    targetPublicKey: string
    reason?: string
    banType: 'permanent' | 'duration' | 'date'
    banUntil?: string // ISO date string, undefined for permanent
  }
  const { targetPublicKey, reason, banType, banUntil } = body

  if (!targetPublicKey) return c.json({ error: 'targetPublicKey required' }, 400)
  if (targetPublicKey === actor.publicKey) return c.json({ error: 'Cannot ban yourself' }, 400)
  if (!banType) return c.json({ error: 'banType required' }, 400)

  const target = getTargetMember(targetPublicKey)
  if (!target) return c.json({ error: 'Member not found' }, 404)
  if (target.role === 'owner') return c.json({ error: 'Cannot ban the server owner' }, 403)

  const banExpiresAt = banType === 'permanent' || !banUntil ? null : new Date(banUntil)

  db.update(members)
    .set({ status: 'banned', banExpiresAt, banReason: reason ?? null })
    .where(eq(members.userPublicKey, targetPublicKey))
    .run()

  await logHistory('ban', actor.publicKey, targetPublicKey, reason ?? null, {
    banType,
    banUntil: banExpiresAt?.toISOString() ?? null,
  })

  sendToUser(targetPublicKey, JSON.stringify({
    type: 'BANNED',
    reason: reason ?? null,
    banUntil: banExpiresAt?.toISOString() ?? null,
  }))

  return c.json({ ok: true })
})

// ── POST /admin/unban ─────────────────────────────────────────────────────────

router.post('/admin/unban', async (c) => {
  const actor = c.get('user')
  const { targetPublicKey, reason } = await c.req.json() as {
    targetPublicKey: string
    reason?: string
  }

  if (!targetPublicKey) return c.json({ error: 'targetPublicKey required' }, 400)

  const target = getTargetMember(targetPublicKey)
  if (!target) return c.json({ error: 'Member not found' }, 404)
  if (target.status !== 'banned') return c.json({ error: 'Member is not banned' }, 400)

  db.update(members)
    .set({ status: 'inactive', banExpiresAt: null, banReason: null })
    .where(eq(members.userPublicKey, targetPublicKey))
    .run()

  await logHistory('unban', actor.publicKey, targetPublicKey, reason ?? null)

  return c.json({ ok: true })
})

export default router
