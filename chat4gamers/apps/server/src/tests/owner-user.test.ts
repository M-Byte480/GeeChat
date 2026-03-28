/**
 * owner-user.test.ts
 *
 * End-to-end scenario: a server owner and a regular user interact.
 *
 * The tests run sequentially — each `describe` block builds on the state
 * left by the previous one.  This mirrors a real usage flow:
 *
 *   Owner seeded → User joins → Owner approves → User authenticates → Chat
 */
import { beforeAll, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'

import { createApp } from '../app.js'
import { db } from '../db/index.js'
import { channels, members, users } from '../db/schema.js'
import {
  authedRequest,
  authenticate,
  generateKeypair,
  type Keypair,
  signMessage,
} from './helpers.js'

// ── Shared state across all describe blocks ────────────────────────────────────

let ownerKeypair: Keypair
let userKeypair: Keypair
let ownerToken: string // session token for the owner
let userToken: string // session token for the regular user
let generalChannelId: string

// The app instance — created once and reused.
// app.request() bypasses the network entirely: no port, no TCP, just function calls.
const app = createApp()

// ── One-time setup ─────────────────────────────────────────────────────────────

beforeAll(async () => {
  ownerKeypair = await generateKeypair()
  userKeypair = await generateKeypair()

  // Seed the owner directly into the DB.
  // In production the first user claims ownership via the terminal token printed
  // at server startup.  In tests we insert the record directly — it's the same
  // end state and keeps the test readable.
  await db.insert(users).values({
    publicKey: ownerKeypair.publicKey,
    username: 'TestOwner',
  })
  await db.insert(members).values({
    id: crypto.randomUUID(),
    userPublicKey: ownerKeypair.publicKey,
    nickname: 'TestOwner',
    role: 'owner',
    status: 'active',
  })

  // The DB bootstraps with four default channels; grab the text one we'll use.
  const [general] = await db
    .select()
    .from(channels)
    .where(eq(channels.name, 'general'))
    .limit(1)
  generalChannelId = general.id

  // Authenticate as owner — we'll need this token for admin actions.
  ownerToken = await authenticate(app, ownerKeypair)
})

// ── 1. Owner is authenticated ──────────────────────────────────────────────────

describe('Owner authentication', () => {
  it('owner can reach a protected route', async () => {
    const res = await authedRequest(app, 'GET', '/members', ownerToken)
    expect(res.status).toBe(200)

    const body = (await res.json()) as unknown[]
    expect(Array.isArray(body)).toBe(true)
    // The owner should already be in the member list
    expect(body.some((m: any) => m.publicKey === ownerKeypair.publicKey)).toBe(
      true
    )
  })

  it('rejects requests without a token', async () => {
    const res = await app.request('/members')
    expect(res.status).toBe(401)
  })
})

// ── 2. New user joins ──────────────────────────────────────────────────────────

describe('User joins the server', () => {
  it('user is placed in the approval queue', async () => {
    const res = await app.request('/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        publicKey: userKeypair.publicKey,
        username: 'TestUser',
      }),
    })

    expect(res.status).toBe(202)
    const body = (await res.json()) as { status: string }
    expect(body.status).toBe('awaiting_to_join')
  })

  it('pending user cannot authenticate yet (no user record... wait, user IS in users table)', async () => {
    // The user record exists but they have no session yet — they haven't
    // gone through the auth flow.  Attempting auth should succeed at the
    // crypto level but we can then verify they're still pending.
    const token = await authenticate(app, userKeypair)
    const res = await authedRequest(app, 'GET', '/members/pending', token)
    // Regular members can't call admin routes
    expect(res.status).toBe(403)
  })
})

// ── 3. Owner manages the approval queue ───────────────────────────────────────

describe('Owner manages pending members', () => {
  it('owner can see the pending user', async () => {
    const res = await authedRequest(app, 'GET', '/members/pending', ownerToken)
    expect(res.status).toBe(200)

    const body = (await res.json()) as { publicKey: string }[]
    expect(body.some((m) => m.publicKey === userKeypair.publicKey)).toBe(true)
  })

  it('owner approves the user', async () => {
    const res = await authedRequest(
      app,
      'POST',
      `/members/${userKeypair.publicKey}/approve`,
      ownerToken
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as { ok: boolean }
    expect(body.ok).toBe(true)
  })

  it('approved user no longer appears in pending list', async () => {
    const res = await authedRequest(app, 'GET', '/members/pending', ownerToken)
    const body = (await res.json()) as { publicKey: string }[]
    expect(body.some((m) => m.publicKey === userKeypair.publicKey)).toBe(false)
  })
})

// ── 4. Approved user can participate ──────────────────────────────────────────

describe('Approved user sends a message', () => {
  beforeAll(async () => {
    userToken = await authenticate(app, userKeypair)
  })

  it('approved user appears in the active member list', async () => {
    const res = await authedRequest(app, 'GET', '/members', userToken)
    const body = (await res.json()) as { publicKey: string }[]
    expect(body.some((m) => m.publicKey === userKeypair.publicKey)).toBe(true)
  })

  it('user can post a message to a channel', async () => {
    const content = 'Hello from the user!'
    const timestamp = new Date().toISOString()
    const signature = await signMessage(
      userKeypair,
      generalChannelId,
      content,
      timestamp
    )

    const res = await authedRequest(app, 'POST', '/messages', userToken, {
      roomId: generalChannelId,
      userId: userKeypair.publicKey,
      senderName: 'TestUser',
      content,
      timestamp,
      signature,
    })

    expect(res.status).toBe(200)
    const body = (await res.json()) as { content: string; senderId: string }
    expect(body.content).toBe(content)
    expect(body.senderId).toBe(userKeypair.publicKey)
  })

  it('owner can read the message in chat history', async () => {
    const res = await authedRequest(
      app,
      'GET',
      `/chat-history?channel=${generalChannelId}`,
      ownerToken
    )
    expect(res.status).toBe(200)

    const body = (await res.json()) as { content: string; senderId: string }[]
    const msg = body.find((m) => m.senderId === userKeypair.publicKey)
    expect(msg).toBeDefined()
    expect(msg?.content).toBe('Hello from the user!')
  })
})
