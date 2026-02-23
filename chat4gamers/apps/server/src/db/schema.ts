import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

// 1. GLOBAL: User Accounts
export const users = sqliteTable('users', {
  id: text('id').primaryKey(), // e.g., 'user_123'
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  avatarUrl: text('avatar_url'),
});

// 2. LOCAL: Chat Messages
export const messages = sqliteTable('messages', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  roomId: text('room_id').notNull(), // e.g., 'main-room'
  senderId: text('sender_id').references(() => users.id),
  content: text('content').notNull(),
  timestamp: integer('timestamp', { mode: 'timestamp' }).notNull(),
});