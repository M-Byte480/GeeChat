// src/db/index.ts
import { drizzle } from 'drizzle-orm/better-sqlite3'
import Database from 'better-sqlite3-multiple-ciphers'
import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import * as schema from './schema.js'

const isProd = process.env.NODE_ENV === 'production'
const dbPath = isProd ? '/app/data/chat.db' : resolve('./data/chat.db')

// Auto-create the directory if it doesn't exist
mkdirSync(dirname(dbPath), { recursive: true })

const sqlite = new Database(dbPath)

// Apply encryption key before any queries (SQLCipher)
if (process.env.DB_KEY) {
  sqlite.pragma(`key = '${process.env.DB_KEY}'`)
}

// Bootstrap schema — safe to run on every startup
sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
                                         public_key TEXT PRIMARY KEY,
                                         username   TEXT NOT NULL,
                                         pfp        TEXT,
                                         created_at INTEGER NOT NULL DEFAULT (unixepoch())
        );

    CREATE TABLE IF NOT EXISTS members (
                                           id              TEXT PRIMARY KEY,
                                           user_public_key TEXT NOT NULL REFERENCES users(public_key) ON DELETE CASCADE,
        nickname        TEXT,
        role            TEXT NOT NULL DEFAULT 'member'
        CHECK(role IN ('owner', 'member')),
        status          TEXT NOT NULL DEFAULT 'awaiting_to_join'
        CHECK(status IN ('active','banned','inactive','awaiting_to_join','denied')),
        joined_at       INTEGER NOT NULL DEFAULT (unixepoch())
        );

    CREATE TABLE IF NOT EXISTS channels (
                                            id   TEXT PRIMARY KEY,
                                            name TEXT NOT NULL,
                                            type TEXT NOT NULL CHECK(type IN ('text', 'voice'))
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

    CREATE INDEX IF NOT EXISTS dm_idx ON direct_messages (sender_id, recipient_id, timestamp);
`)

// Migration guards for databases predating this schema
try {
  sqlite.exec(`ALTER TABLE messages ADD COLUMN signature TEXT NOT NULL DEFAULT ''`)
} catch {}

// Seed default channels if the table is empty
const channelCount = (sqlite.prepare('SELECT COUNT(*) as cnt FROM channels').get() as any).cnt
if (channelCount === 0) {
  sqlite.exec(`
      INSERT INTO channels (id, name, type) VALUES
                                                ('general',   'general',   'text'),
                                                ('off-topic', 'off-topic', 'text'),
                                                ('hideout',   'hideout',   'voice'),
                                                ('gaming',    'gaming',    'voice');
  `)
}

export const db = drizzle(sqlite, { schema })
