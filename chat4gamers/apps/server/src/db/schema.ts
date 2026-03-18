import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const MemberStatus = ['active', 'banned', 'inactive', 'awaiting_to_join', 'denied'] as const;
export type MemberStatusType = typeof MemberStatus[number];

export const MemberRole = ['owner', 'member', 'admin'] as const;
export type MemberRoleType = typeof MemberRole[number];

export const ChannelType = ['text', 'voice'] as const;
export type ChannelTypeType = typeof ChannelType[number];

// Source of truth for a user's identity across all servers.
// Keyed by Ed25519 public key — no passwords, the key IS the identity.
export const users = sqliteTable('users', {
  publicKey: text('public_key').primaryKey(),
  username:  text('username').notNull(),
  pfp:       text('pfp'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

// Per-server membership record. Status drives the approval flow.
// First user to join automatically becomes owner with active status.
export const members = sqliteTable('members', {
  id:           text('id').primaryKey(),
  userPublicKey: text('user_public_key')
    .notNull()
    .references(() => users.publicKey, { onDelete: 'cascade' }),
  nickname: text('nickname'),
  role:     text('role').$type<MemberRoleType>().notNull().default('member'),
  status:   text('status').$type<MemberStatusType>().notNull().default('awaiting_to_join'),
  joinedAt: integer('joined_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const channels = sqliteTable('channels', {
  id:   text('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type').$type<ChannelTypeType>().notNull().default('text'),
});

export const directMessages = sqliteTable('direct_messages', {
  id:          integer('id').primaryKey({ autoIncrement: true }),
  senderId:    text('sender_id').notNull().references(() => users.publicKey),
  recipientId: text('recipient_id').notNull().references(() => users.publicKey),
  content:     text('content').notNull(),
  timestamp:   integer('timestamp', { mode: 'timestamp' }).notNull(),
  signature:   text('signature').notNull(),
});

export const messages = sqliteTable('messages', {
  id:        integer('id').primaryKey({ autoIncrement: true }),
  channelId: text('channel_id')
    .notNull()
    .references(() => channels.id, { onDelete: 'cascade' }),
  senderId: text('sender_id')
    .notNull()
    .references(() => users.publicKey),
  content:   text('content').notNull(),
  timestamp: integer('timestamp', { mode: 'timestamp' }).notNull(),
  signature: text('signature').notNull(),
}, (table) => ({
  channelTimestampIdx: index('channel_timestamp_idx').on(table.channelId, table.timestamp),
}));

export const relaySubscriptions = sqliteTable('relay_subscriptions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  relayId: text('relay_id').notNull(), // The URL of the relay node
  userPublicKey: text('user_public_key').notNull(), // The user subscribing
  topic: text('topic').notNull(), // The channelId or DM recipientKey
});

export const media = sqliteTable('media', {
  id:           integer('id').primaryKey({ autoIncrement: true }),
  uploaderKey:  text('uploader_key').notNull().references(() => users.publicKey),
  url:          text('url').notNull(),          // CDN or local URL
  mimeType:     text('mime_type').notNull(),     // e.g. 'image/png'
  sizeBytes:    integer('size_bytes').notNull(),
  context:      text('context'),                // e.g. 'avatar', 'message', 'channel'
  contextId:    text('context_id'),             // e.g. channelId or messageId
  createdAt:    integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const sessions = sqliteTable('sessions', {
  token:     text('token').primaryKey(),
  publicKey: text('public_key').notNull().references(() => users.publicKey, { onDelete: 'cascade' }),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
});
