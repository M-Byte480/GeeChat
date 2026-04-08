// src/db/index.ts
import { drizzle } from 'drizzle-orm/better-sqlite3'
import Database from 'better-sqlite3-multiple-ciphers'
import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import * as schema from './schema.js'

const isProd = process.env.NODE_ENV === 'production'
const dbPath =
  process.env.DB_PATH ??
  (isProd ? '/app/data/chat.db' : resolve('./data/chat.db'))

mkdirSync(dirname(dbPath), { recursive: true })

const sqlite = new Database(dbPath)

if (process.env.DB_KEY) {
  sqlite.pragma(`key = '${process.env.DB_KEY}'`)
}

// Bootstrap schema — creates all tables on a fresh DB, safe to re-run (IF NOT EXISTS).
// No migration guards — delete the DB file to reset during development.
sqlite.exec(`
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
    role             TEXT NOT NULL DEFAULT 'member'
                          CHECK (role IN ('owner', 'admin', 'member')),
    status           TEXT NOT NULL DEFAULT 'awaiting_to_join'
                          CHECK (status IN ('active', 'banned', 'inactive', 'awaiting_to_join', 'denied')),
    joined_at        INTEGER NOT NULL DEFAULT (unixepoch()),
    ban_expires_at   INTEGER,
    ban_reason       TEXT
  );

  CREATE TABLE IF NOT EXISTS channels (
    id   TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('text', 'voice'))
  );

  CREATE TABLE IF NOT EXISTS messages (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    channel_id TEXT    NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    sender_id  TEXT    NOT NULL REFERENCES users(public_key),
    content    TEXT    NOT NULL,
    timestamp  INTEGER NOT NULL,
    signature  TEXT    NOT NULL DEFAULT '',
    deleted_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS direct_messages (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_id    TEXT    NOT NULL REFERENCES users(public_key),
    recipient_id TEXT    NOT NULL REFERENCES users(public_key),
    content      TEXT    NOT NULL,
    timestamp    INTEGER NOT NULL,
    signature    TEXT    NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token      TEXT    PRIMARY KEY,
    public_key TEXT    NOT NULL REFERENCES users(public_key) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS reactions (
    message_id      INTEGER NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    user_public_key TEXT    NOT NULL REFERENCES users(public_key) ON DELETE CASCADE,
    emoji           TEXT    NOT NULL,
    created_at      INTEGER NOT NULL DEFAULT (unixepoch()),
    PRIMARY KEY (message_id, user_public_key, emoji)
  );

  CREATE TABLE IF NOT EXISTS relay_subscriptions (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    relay_id         TEXT    NOT NULL,
    user_public_key  TEXT    NOT NULL,
    topic            TEXT    NOT NULL
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

  CREATE TABLE IF NOT EXISTS activity (
    id   TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
  );

  CREATE TABLE IF NOT EXISTS history (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    activity_id       TEXT    NOT NULL REFERENCES activity(id),
    actor_public_key  TEXT    NOT NULL REFERENCES users(public_key),
    target_public_key TEXT    REFERENCES users(public_key),
    reason            TEXT,
    metadata          TEXT,
    timestamp         INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS roles (
    id       TEXT    PRIMARY KEY,
    name     TEXT    NOT NULL,
    color    TEXT    NOT NULL DEFAULT '#5865f2',
    position INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS permissions (
    id   TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
  );

  CREATE TABLE IF NOT EXISTS role_permissions (
    role_id       TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id TEXT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
  );

  CREATE TABLE IF NOT EXISTS user_roles (
    user_public_key TEXT NOT NULL REFERENCES users(public_key) ON DELETE CASCADE,
    role_id         TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY (user_public_key, role_id)
  );

  CREATE INDEX IF NOT EXISTS channel_timestamp_idx ON messages (channel_id, timestamp);
  CREATE INDEX IF NOT EXISTS dm_idx ON direct_messages (sender_id, recipient_id, timestamp);
`)

// Seed default channels
const channelCount = (
  sqlite.prepare('SELECT COUNT(*) as cnt FROM channels').get() as { cnt: number }
).cnt
if (channelCount === 0) {
  sqlite.exec(`
    INSERT INTO channels (id, name, type) VALUES
      ('general',   'general',   'text'),
      ('off-topic', 'off-topic', 'text'),
      ('hideout',   'hideout',   'voice'),
      ('gaming',    'gaming',    'voice');
  `)
}

// Seed activity types
const activityCount = (
  sqlite.prepare('SELECT COUNT(*) as cnt FROM activity').get() as { cnt: number }
).cnt
if (activityCount === 0) {
  sqlite.exec(`
    INSERT INTO activity (id, name) VALUES
      ('act_join',    'join'),
      ('act_leave',   'leave'),
      ('act_approve', 'approve'),
      ('act_deny',    'deny'),
      ('act_kick',    'kick'),
      ('act_ban',     'ban'),
      ('act_unban',   'unban');
  `)
}

export const db = drizzle(sqlite, { schema })
