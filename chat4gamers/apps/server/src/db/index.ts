// src/db/index.ts
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3-multiple-ciphers';
 // import Database from 'better-sqlite3-multiple-ciphers';
import * as schema from './schema.js'; // Note the .js for TS2834 compatibility

// This line opens (or creates) the chat.db file.
// { verbose: console.log } is optional but great for seeing the SQL in your terminal.
const sqlite = new Database('./data/chat.db'); // Match the Docker volume path

// CRUCIAL: You must set the key BEFORE any other queries run
// sqlite.pragma(`key = 'YOUR_SECRET_ENCRYPTION_KEY'`);

// We export 'db' so other files can use it.
// Passing the schema here lets Drizzle know about your tables (users, messages).
export const db = drizzle(sqlite, { schema });