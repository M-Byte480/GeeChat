import type { Hono } from 'hono'

// ── Types ──────────────────────────────────────────────────────────────────────

export interface Keypair {
  /** Raw 32-byte Ed25519 public key encoded as base64url — this is the user's identity. */
  publicKey: string
  /** CryptoKey used to sign challenges and messages. */
  privateKey: CryptoKey
}

// ── Key generation ─────────────────────────────────────────────────────────────

/**
 * Generates a fresh Ed25519 keypair.
 * The public key is exported as raw bytes (32 bytes) and base64url-encoded,
 * which matches the format the server stores in the `users` table.
 */
export async function generateKeypair(): Promise<Keypair> {
  const { privateKey, publicKey: rawPublic } = (await crypto.subtle.generateKey(
    { name: 'Ed25519' } as Algorithm,
    true,
    ['sign', 'verify']
  )) as CryptoKeyPair
  const exported = await crypto.subtle.exportKey('raw', rawPublic)
  return {
    publicKey: Buffer.from(exported).toString('base64url'),
    privateKey,
  }
}

// ── Auth helpers ───────────────────────────────────────────────────────────────

/**
 * Runs the full Ed25519 challenge/verify handshake against the app and
 * returns a session token.
 *
 * Flow:
 *  1. POST /auth/challenge  → server returns a random hex nonce
 *  2. Sign the nonce with the private key
 *  3. POST /auth/verify     → server checks signature, issues token
 */
export async function authenticate(
  app: Hono,
  keypair: Keypair
): Promise<string> {
  // Step 1 — get a challenge nonce
  const challengeRes = await app.request('/auth/challenge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ publicKey: keypair.publicKey }),
  })
  const { challenge } = (await challengeRes.json()) as { challenge: string }

  // Step 2 — sign the nonce
  const nonce = new TextEncoder().encode(challenge)
  const sigBuffer = await crypto.subtle.sign(
    { name: 'Ed25519' } as Algorithm,
    keypair.privateKey,
    nonce
  )
  const signature = Buffer.from(sigBuffer).toString('base64url')

  // Step 3 — verify and receive token
  const verifyRes = await app.request('/auth/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ publicKey: keypair.publicKey, signature }),
  })
  const body = (await verifyRes.json()) as { token?: string; error?: string }
  if (!body.token) throw new Error(`Auth failed: ${body.error}`)
  return body.token
}

// ── Message signing ────────────────────────────────────────────────────────────

/**
 * Signs a message payload the same way the client does before POSTing to
 * /messages.  The server re-derives this payload and verifies the signature,
 * so the format must match exactly: `${channelId}:${timestamp}:${content}`
 */
export async function signMessage(
  keypair: Keypair,
  channelId: string,
  content: string,
  timestamp: string
): Promise<string> {
  const payload = Buffer.from(`${channelId}:${timestamp}:${content}`, 'utf8')
  const sigBuffer = await crypto.subtle.sign(
    { name: 'Ed25519' } as Algorithm,
    keypair.privateKey,
    payload
  )
  return Buffer.from(sigBuffer).toString('base64url')
}

// ── Request helpers ────────────────────────────────────────────────────────────

/** Convenience wrapper for authenticated JSON requests. */
export async function authedRequest(
  app: Hono,
  method: string,
  path: string,
  token: string,
  body?: unknown
) {
  return app.request(path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
}
