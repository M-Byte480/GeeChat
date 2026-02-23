import { Hono } from 'hono';
import { db } from '../db/index.js';
import { messages } from '../db/schema.js';
import {desc, eq} from "drizzle-orm";

const chat = new Hono();

chat.get('/history/:roomId', async (c) => {
  const roomId = c.req.param('roomId');

  const history = await db.select()
    .from(messages)
    .where(eq(messages.roomId, roomId))
    .orderBy(desc(messages.timestamp))
    .limit(50); // Only get last 50

  return c.json(history.reverse()); // Reverse so they are in chronological order
});

chat.post('/send', async (c) => {
  const { content, roomId, userId } = await c.req.json();

  const result = await db.insert(messages).values({
    content,
    roomId,
    senderId: userId,
    timestamp: new Date()
  }).returning();

  return c.json(result[0]);
});

export default chat;