/**
 * global-setup.ts  (Playwright)
 *
 * Runs once before any test file.  Creates a fresh SQLite database for the
 * E2E test server, seeds it with two users (owner + regular user), and writes
 * their serialized identities to a JSON fixture file.
 *
 * Each Playwright browser context reads from that file and injects its
 * identity into localStorage via addInitScript — giving each context a
 * completely separate, pre-authenticated session without going through the UI
 * onboarding flow.
 */
import { generateKeyPairSync, randomBytes } from 'node:crypto'
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

export const E2E_DB_PATH = resolve(__dirname, '../../server/.e2e.db')
export const E2E_FIXTURES_PATH = resolve(__dirname, '../.e2e-fixtures.json')
export const E2E_SERVER_URL = 'http://localhost:4001'

// ── Schema SQL (mirrors apps/server/src/db/index.ts bootstrap) ────────────────

const SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS users (
    public_key TEXT PRIMARY KEY,
    username   TEXT NOT NULL,
    pfp        TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );
  CREATE TABLE IF NOT EXISTS members (
    id               TEXT PRIMARY KEY,
    user_public_key  TEXT NOT NULL REFERENCES users(public_key) ON DELETE CASCADE,
    nickname         TEXT,
    role             TEXT NOT NULL DEFAULT 'member',
    status           TEXT NOT NULL DEFAULT 'awaiting_to_join',
    joined_at        INTEGER NOT NULL DEFAULT (unixepoch())
  );
  CREATE TABLE IF NOT EXISTS channels (
    id   TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'text'
  );
  CREATE TABLE IF NOT EXISTS messages (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    channel_id TEXT NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    sender_id  TEXT NOT NULL REFERENCES users(public_key),
    content    TEXT NOT NULL,
    timestamp  INTEGER NOT NULL,
    signature  TEXT NOT NULL DEFAULT ''
  );
  CREATE TABLE IF NOT EXISTS direct_messages (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_id    TEXT NOT NULL REFERENCES users(public_key),
    recipient_id TEXT NOT NULL REFERENCES users(public_key),
    content      TEXT NOT NULL,
    timestamp    INTEGER NOT NULL,
    signature    TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token      TEXT    PRIMARY KEY,
    public_key TEXT    NOT NULL REFERENCES users(public_key) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );
  CREATE TABLE IF NOT EXISTS relay_subscriptions (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    relay_id         TEXT NOT NULL,
    user_public_key  TEXT NOT NULL,
    topic            TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS media (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    uploader_key TEXT    NOT NULL REFERENCES users(public_key),
    url          TEXT    NOT NULL,
    mime_type    TEXT    NOT NULL,
    size_bytes   INTEGER NOT NULL,
    context      TEXT,
    context_id   TEXT,
    created_at   INTEGER NOT NULL DEFAULT (unixepoch())
  );
  CREATE INDEX IF NOT EXISTS channel_timestamp_idx ON messages (channel_id, timestamp);
  CREATE INDEX IF NOT EXISTS dm_idx ON direct_messages (sender_id, recipient_id, timestamp);

  INSERT OR IGNORE INTO channels (id, name, type) VALUES
    ('general',   'general',   'text'),
    ('off-topic', 'off-topic', 'text'),
    ('hideout',   'hideout',   'voice'),
    ('gaming',    'gaming',    'voice');
`

// ── Helpers ───────────────────────────────────────────────────────────────────

function generateEd25519() {
  const { privateKey, publicKey } = generateKeyPairSync('ed25519', {
    privateKeyEncoding: { type: 'pkcs8', format: 'der' },
    publicKeyEncoding: { type: 'spki', format: 'der' },
  })

  // Raw 32-byte public key sits after the 12-byte SPKI header
  const rawPublicKey = (publicKey as unknown as Buffer).slice(12)
  const publicKeyB64url = rawPublicKey.toString('base64url')

  // Private key as plain base64 — matches serializeForStorage() in crypto.ts
  const privateKeyB64 = (privateKey as unknown as Buffer).toString('base64')

  return { publicKeyB64url, privateKeyB64 }
}

/** Build the JSON string that IdentityGate reads from localStorage. */
function buildIdentityJson(opts: {
  publicKey: string
  username: string
  privateKeyB64: string
  sessionToken: string
}) {
  return JSON.stringify({
    publicKey: opts.publicKey,
    username: opts.username,
    pfp: undefined,
    privateKeyB64: opts.privateKeyB64,
    servers: [
      { id: 'e2e-server', url: E2E_SERVER_URL, name: 'E2E Test Server' },
    ],
    sessionTokens: { [E2E_SERVER_URL]: opts.sessionToken },
  })
}

// ── Main setup ────────────────────────────────────────────────────────────────

export default async function globalSetup() {
  // Clean up any leftover DB from a previous run
  if (existsSync(E2E_DB_PATH)) rmSync(E2E_DB_PATH)
  mkdirSync(dirname(E2E_DB_PATH), { recursive: true })

  // Import better-sqlite3 and create the DB (dynamic import so it stays lazy)
  const { default: Database } = await import('better-sqlite3-multiple-ciphers')
  const sqlite = new Database(E2E_DB_PATH)
  sqlite.exec(SCHEMA_SQL)

  // Generate Ed25519 keypairs for both actors
  const owner = generateEd25519()
  const user = generateEd25519()

  // Session tokens (stored in DB so the server accepts them)
  const ownerSessionToken = randomBytes(32).toString('base64url')
  const userSessionToken = randomBytes(32).toString('base64url')
  const expiresAt = Math.floor(Date.now() / 1000) + 86_400 // 24 h from now

  // Seed users, members, sessions using parameterised statements
  const insertUser = sqlite.prepare(
    'INSERT INTO users (public_key, username) VALUES (?, ?)'
  )
  const insertMember = sqlite.prepare(
    'INSERT INTO members (id, user_public_key, nickname, role, status) VALUES (?, ?, ?, ?, ?)'
  )
  const insertSession = sqlite.prepare(
    'INSERT INTO sessions (token, public_key, expires_at) VALUES (?, ?, ?)'
  )

  insertUser.run(owner.publicKeyB64url, 'E2EOwner')
  insertUser.run(user.publicKeyB64url, 'E2EUser')

  insertMember.run(
    randomBytes(16).toString('hex'),
    owner.publicKeyB64url,
    'E2EOwner',
    'owner',
    'active'
  )
  insertMember.run(
    randomBytes(16).toString('hex'),
    user.publicKeyB64url,
    'E2EUser',
    'member',
    'active'
  )

  insertSession.run(ownerSessionToken, owner.publicKeyB64url, expiresAt)
  insertSession.run(userSessionToken, user.publicKeyB64url, expiresAt)

  sqlite.close()

  // Write the fixture file tests will read
  const fixtures = {
    ownerIdentity: buildIdentityJson({
      publicKey: owner.publicKeyB64url,
      username: 'E2EOwner',
      privateKeyB64: owner.privateKeyB64,
      sessionToken: ownerSessionToken,
    }),
    userIdentity: buildIdentityJson({
      publicKey: user.publicKeyB64url,
      username: 'E2EUser',
      privateKeyB64: user.privateKeyB64,
      sessionToken: userSessionToken,
    }),
    ownerPublicKey: owner.publicKeyB64url,
    userPublicKey: user.publicKeyB64url,
    serverUrl: E2E_SERVER_URL,
  }

  writeFileSync(E2E_FIXTURES_PATH, JSON.stringify(fixtures, null, 2))
  console.log('[E2E setup] DB seeded, fixtures written to', E2E_FIXTURES_PATH)
}
