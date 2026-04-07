import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { db } from '../db/index.js'
import { roles } from '../db/schema.js'
import { requireAdmin, requireAuth, requireMember } from '../lib/middleware.js'
import type { AppEnv } from '../lib/types.js'

const router = new Hono<AppEnv>()

/**
 * GET /roles
 * Returns all server roles ordered by position. Any active member can read.
 */
router.get('/roles', requireAuth, requireMember, async (c) => {
  const rows = await db.select().from(roles).orderBy(roles.position)
  return c.json(rows)
})

/**
 * PUT /roles
 * Bulk-saves the full ordered role list. Admin/Owner only.
 * Body: [{ id, name, color }]
 * Position is derived from array index — no extra field needed from client.
 * Roles absent from the payload are deleted (cascades to user_roles).
 */
router.put('/roles', requireAuth, requireAdmin, async (c) => {
  const body = (await c.req.json()) as Array<{
    id: string
    name: string
    color: string
  }>

  if (!Array.isArray(body)) return c.json({ error: 'Expected array' }, 400)

  const existing = await db.select({ id: roles.id }).from(roles)
  const existingIds = new Set(existing.map((r) => r.id))
  const incomingIds = new Set(body.map((r) => r.id))

  // Delete roles that were removed
  for (const { id } of existing) {
    if (!incomingIds.has(id)) {
      await db.delete(roles).where(eq(roles.id, id))
    }
  }

  // Upsert remaining/new roles with position = array index
  for (let i = 0; i < body.length; i++) {
    const { id, name, color } = body[i]!
    if (existingIds.has(id)) {
      await db.update(roles).set({ name, color, position: i }).where(eq(roles.id, id))
    } else {
      await db.insert(roles).values({ id, name, color, position: i })
    }
  }

  return c.json({ ok: true })
})

export default router
