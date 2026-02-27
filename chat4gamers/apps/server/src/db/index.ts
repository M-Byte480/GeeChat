// src/db/index.ts
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3-multiple-ciphers';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import * as schema from './schema.js';

const isProd = process.env.NODE_ENV === 'production';
const dbPath = isProd ? '/app/data/chat.db' : resolve('./data/chat.db');

// Auto-create the directory if it doesn't exist
mkdirSync(dirname(dbPath), { recursive: true });

const sqlite = new Database(dbPath);

// Apply encryption key before any queries (SQLCipher)
if (process.env.DB_KEY) {
  sqlite.pragma(`key = '${process.env.DB_KEY}'`);
}

// Bootstrap schema — safe to run on every startup
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    avatar_url TEXT
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id TEXT NOT NULL,
    sender_id TEXT,
    content TEXT NOT NULL,
    timestamp INTEGER NOT NULL
  );
`);

export const db = drizzle(sqlite, { schema });