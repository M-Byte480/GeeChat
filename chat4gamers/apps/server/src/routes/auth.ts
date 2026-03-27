import { Hono } from 'hono'
import { db } from '../db/index.js' // Import your db instance
import { sessions, users } from '../db/schema.js'
import { eq } from 'drizzle-orm'
import { PublicKey } from '../types.js'
import crypto from 'crypto'

const auth = new Hono()
const pendingChallenges = new Map<
  PublicKey,
  { nonce: string; expiresAt: number }
>()

auth.post('/challenge', async (c) => {
  const { publicKey } = await c.req.json()

  if (!publicKey) {
    return c.json({ error: 'publicKey required' }, 400)
  }

  const nonce = crypto.getRandomValues(new Uint8Array(32))
  const nonceHex = Buffer.from(nonce).toString('hex')
  const expiresAt = Date.now() + 60_000

  pendingChallenges.set(publicKey, { nonce: nonceHex, expiresAt })

  return c.json({ challenge: nonceHex })
})

auth.post('/verify', async (c) => {
  const { publicKey: publicKeyBase64, signature: signatureBase64 } =
    await c.req.json()

  const pending = pendingChallenges.get(publicKeyBase64)

  if (!pending || Date.now() > pending.expiresAt) {
    return c.json({ error: 'Challenge expired or not found' }, 401)
  }

  pendingChallenges.delete(publicKeyBase64)

  const publicKeyBuffer = Buffer.from(publicKeyBase64, 'base64url')
  const signatureBuffer = Buffer.from(signatureBase64, 'base64url')

  const challengeBuffer = new TextEncoder().encode(pending.nonce)

  try {
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      publicKeyBuffer,
      { name: 'Ed25519' },
      false,
      ['verify']
    )

    const isValid = await crypto.subtle.verify(
      'Ed25519',
      cryptoKey,
      signatureBuffer,
      challengeBuffer
    )
    if (!isValid) {
      return c.json({ error: 'Invalid signature' }, 401)
    }
  } catch {
    return c.json({ error: 'Invalid public key format' }, 400)
  }

  const user = db
    .select()
    .from(users)
    .where(eq(users.publicKey, publicKeyBase64))
    .get()

  if (!user) {
    return c.json({ error: 'User not found' }, 404)
  }

  // Issue opaque session token
  const sessionToken = Buffer.from(
    crypto.getRandomValues(new Uint8Array(32))
  ).toString('base64url')
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24) // 24h

  await db.insert(sessions).values({
    token: sessionToken,
    publicKey: user.publicKey,
    expiresAt,
  })

  return c.json({ token: sessionToken, user: { username: user.username } })
})

export default auth
