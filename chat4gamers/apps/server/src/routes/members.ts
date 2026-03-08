import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { db } from '../db/index.js'
import { users, members } from '../db/schema.js'

// ── Owner bootstrap token ────────────────────────────────────────────────────
// Generated once when the server has no owner. Printed to the terminal so the
// first administrator can claim ownership when joining.
let ownerToken: string | null = null

function getOwnerToken(): string {
  if (!ownerToken) {
    ownerToken = Math.random().toString(36).slice(2, 8).toUpperCase() +
                 Math.random().toString(36).slice(2, 8).toUpperCase()
    console.log('\n┌─────────────────────────────────────────┐')
    console.log('│        NO OWNER REGISTERED              │')
    console.log('│                                         │')
    console.log(`│  Owner token: ${ownerToken.padEnd(26)}│`)
    console.log('│                                         │')
    console.log('│  Enter this token when joining to       │')
    console.log('│  claim server ownership.                │')
    console.log('└─────────────────────────────────────────┘\n')
  }
  return ownerToken
}

const router = new Hono()

/**
 * POST /join
 * Called when a user adds this server. Handles two cases:
 *  - Returning user (same publicKey, new device) → already has a member record → let them in.
 *  - New user → insert with awaiting_to_join, except the very first user who becomes owner.
 */
router.post('/join', async (c) => {
  const body = await c.req.json()
  const { publicKey, username, pfp, ownerToken: providedToken } =
    body as { publicKey: string; username: string; pfp?: string; ownerToken?: string }

  if (!publicKey || !username) {
    return c.json({ error: 'publicKey and username are required' }, 400)
  }

  // Upsert the user record (device migration: same key, possibly new username/pfp)
  const existingUser = await db.select().from(users).where(eq(users.publicKey, publicKey)).get()
  if (!existingUser) {
    await db.insert(users).values({ publicKey, username, pfp })
  } else {
    await db.update(users).set({ username, pfp }).where(eq(users.publicKey, publicKey))
  }

  // Check existing membership
  const existingMember = await db.select().from(members).where(eq(members.userPublicKey, publicKey)).get()
  if (existingMember) {
    if (existingMember.status === 'denied') return c.json({ status: 'denied' }, 403)
    if (existingMember.status === 'banned') return c.json({ status: 'banned' }, 403)
    return c.json({ status: existingMember.status })
  }

  // Check if any owner exists
  const existingOwner = await db.select({ id: members.id })
    .from(members).where(eq(members.role, 'owner')).get()

  if (!existingOwner) {
    // No owner yet — require the terminal token to claim ownership
    const token = getOwnerToken()
    if (!providedToken) {
      return c.json({ requiresToken: true }, 202)
    }
    if (providedToken !== token) {
      return c.json({ error: 'Invalid owner token' }, 403)
    }
    // Token matched — this user becomes the owner
    await db.insert(members).values({
      id: crypto.randomUUID(),
      userPublicKey: publicKey,
      nickname: username,
      role: 'owner',
      status: 'active',
    })
    ownerToken = null // invalidate token after use
    return c.json({ status: 'active', role: 'owner' })
  }

  // Normal new member — goes into the approval queue
  await db.insert(members).values({
    id: crypto.randomUUID(),
    userPublicKey: publicKey,
    nickname: username,
    role: 'member',
    status: 'awaiting_to_join',
  })

  return c.json({ status: 'awaiting_to_join' }, 202)
})

/**
 * GET /members
 * Returns all active members — used by the client to populate the member pane.
 */
router.get('/members', async (c) => {
  const rows = await db
    .select({
      publicKey: users.publicKey,
      username:  users.username,
      pfp:       users.pfp,
      nickname:  members.nickname,
      role:      members.role,
      status:    members.status,
    })
    .from(members)
    .innerJoin(users, eq(members.userPublicKey, users.publicKey))
    .where(eq(members.status, 'active'))
  return c.json(rows)
})

/**
 * GET /members/pending
 * Returns members awaiting owner approval.
 */
router.get('/members/pending', async (c) => {
  const rows = await db
    .select({
      publicKey: users.publicKey,
      username:  users.username,
      pfp:       users.pfp,
      nickname:  members.nickname,
      joinedAt:  members.joinedAt,
    })
    .from(members)
    .innerJoin(users, eq(members.userPublicKey, users.publicKey))
    .where(eq(members.status, 'awaiting_to_join'))
  return c.json(rows)
})

/**
 * POST /members/:publicKey/approve
 */
router.post('/members/:publicKey/approve', async (c) => {
  const { publicKey } = c.req.param()
  await db.update(members).set({ status: 'active' }).where(eq(members.userPublicKey, publicKey))
  return c.json({ ok: true })
})

/**
 * POST /members/:publicKey/deny
 */
router.post('/members/:publicKey/deny', async (c) => {
  const { publicKey } = c.req.param()
  await db.update(members).set({ status: 'denied' }).where(eq(members.userPublicKey, publicKey))
  return c.json({ ok: true })
})

export default router
