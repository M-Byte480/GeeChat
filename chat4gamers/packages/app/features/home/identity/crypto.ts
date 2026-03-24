import type { Identity, IdentityFile } from './types'

// ── Base64 helpers ────────────────────────────────────────────────────────────

function toBase64url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

function fromBase64url(str: string): Uint8Array {
  const padded = str
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(str.length + ((4 - (str.length % 4)) % 4), '=')
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0))
}

function toBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
}

function fromBase64(str: string): Uint8Array {
  return Uint8Array.from(atob(str), (c) => c.charCodeAt(0))
}

// ── Key derivation ────────────────────────────────────────────────────────────

async function deriveAesKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  )
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 310_000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function generateIdentity(
  username: string,
  pfp: string | undefined,
  passphrase: string
): Promise<{ file: IdentityFile; identity: Identity }> {
  // Generate Ed25519 key pair
  const keyPair = await crypto.subtle.generateKey({ name: 'Ed25519' } as any, true, [
    'sign',
    'verify',
  ])

  // Export public key as raw bytes (32 bytes)
  const publicKeyRaw = await crypto.subtle.exportKey('raw', keyPair.publicKey)
  const publicKey = toBase64url(new Uint8Array(publicKeyRaw))

  // Export private key as PKCS8
  const pkcs8 = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey)
  const privateKeyBytes = new Uint8Array(pkcs8)

  // Derive AES key from passphrase
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const aesKey = await deriveAesKey(passphrase, salt)

  // Encrypt PKCS8 private key
  const encryptedBuf = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, aesKey, privateKeyBytes)

  const file: IdentityFile = {
    version: 1,
    publicKey,
    username,
    pfp,
    encryptedPrivateKey: toBase64(new Uint8Array(encryptedBuf)),
    salt: toBase64(salt),
    iv: toBase64(iv),
  }

  const identity: Identity = {
    publicKey,
    username,
    pfp,
    privateKeyBytes,
    servers: [],
    sessionTokens: {},
  }

  return { file, identity }
}

export async function decryptIdentity(file: IdentityFile, passphrase: string): Promise<Identity> {
  const salt = fromBase64(file.salt)
  const iv = fromBase64(file.iv)
  const encryptedPrivateKey = fromBase64(file.encryptedPrivateKey)

  const aesKey = await deriveAesKey(passphrase, salt)

  let decryptedBuf: ArrayBuffer
  try {
    decryptedBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, aesKey, encryptedPrivateKey)
  } catch {
    throw new Error('Wrong passphrase or corrupted identity file')
  }

  return {
    publicKey: file.publicKey,
    username: file.username,
    pfp: file.pfp,
    privateKeyBytes: new Uint8Array(decryptedBuf),
    servers: file.servers ?? [],
    sessionTokens: file.sessionTokens ?? {},
  }
}

export async function signMessage(
  privateKeyBytes: Uint8Array,
  content: string,
  channelId: string,
  timestamp: string
): Promise<string> {
  const privateKey = await crypto.subtle.importKey(
    'pkcs8',
    privateKeyBytes,
    { name: 'Ed25519' } as any,
    false,
    ['sign']
  )

  const payload = new TextEncoder().encode(`${channelId}:${timestamp}:${content}`)
  const signatureBuf = await crypto.subtle.sign({ name: 'Ed25519' } as any, privateKey, payload)

  return toBase64url(new Uint8Array(signatureBuf))
}

export async function signChallenge(
  privateKeyBytes: Uint8Array,
  challenge: string
): Promise<string> {
  const privateKey = await crypto.subtle.importKey(
    'pkcs8',
    privateKeyBytes,
    { name: 'Ed25519' } as any,
    false,
    ['sign']
  )
  const signatureBuf = await crypto.subtle.sign(
    { name: 'Ed25519' } as any,
    privateKey,
    new TextEncoder().encode(challenge)
  )
  return toBase64url(new Uint8Array(signatureBuf))
}

// ── safeStorage helpers ───────────────────────────────────────────────────────

/** Serialize an Identity to the compact StoredIdentity JSON for safeStorage */
export function serializeForStorage(identity: Identity): string {
  const privateKeyB64 = btoa(String.fromCharCode(...identity.privateKeyBytes))
  return JSON.stringify({
    publicKey: identity.publicKey,
    username: identity.username,
    pfp: identity.pfp,
    privateKeyB64,
    servers: identity.servers,
    sessionTokens: identity.sessionTokens ?? {},
  })
}

/** Deserialize a StoredIdentity JSON string back to an Identity */
export function deserializeFromStorage(json: string): Identity {
  const stored = JSON.parse(json)
  const privateKeyBytes = Uint8Array.from(atob(stored.privateKeyB64), (c) => c.charCodeAt(0))
  return {
    publicKey: stored.publicKey,
    username: stored.username,
    pfp: stored.pfp,
    privateKeyBytes,
    servers: stored.servers ?? [],
    sessionTokens: stored.sessionTokens ?? {},
  }
}
