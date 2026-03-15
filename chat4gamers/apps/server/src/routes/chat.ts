import { Hono } from 'hono';
import { db } from '../db/index.js';
import { messages } from '../db/schema.js';
import {desc, eq} from "drizzle-orm";

const chat = new Hono();

chat.get('/history/:roomId', async (c) => {
  const roomId = c.req.param('roomId');

  const history = await db.select()
    .from(messages)
    .where(eq(messages.channelId, roomId))
    .orderBy(desc(messages.timestamp))
    .limit(50); // Only get last 50

  return c.json(history.reverse()); // Reverse so they are in chronological order
});

chat.post('/send', async (c) => {
  const { content, roomId, userId, signature = '' } = await c.req.json();

  const result = await db.insert(messages).values({
    channelId: roomId,
    senderId: userId,
    content,
    timestamp: new Date(),
    signature,
  }).returning();

  return c.json(result[0]);
});

export default chat;