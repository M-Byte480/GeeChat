import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { cors } from 'hono/cors'
import { AccessToken } from 'livekit-server-sdk'
import { createNodeWebSocket } from '@hono/node-ws' // <-- CHANGE TO THIS
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3-multiple-ciphers';
import authRoutes from './routes/auth.js';
import chatRoutes from './routes/chat.js';
import { trimTrailingSlash } from 'hono/trailing-slash'
import {messages} from "./db/schema.js";
const sqlite = new Database('chat.db');
const db = drizzle(sqlite);
import { eq, desc } from 'drizzle-orm';

const app = new Hono()
const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app }) // <-- ADD THIS
const clients = new Set<any>();
app.use('*', trimTrailingSlash())

// Middlewares
app.use('*', logger()) // Log requests to console
app.use('*', cors({
  origin: '*', // For testing, allow everything
  allowMethods: ['GET', 'POST', 'OPTIONS'],
}))
// Your "Server" Data Routes
app.get('/', (c) => {
  return c.json({
    status: 'online',
    message: 'Private Server Instance Ready',
    version: '1.0.0'
  })
})

// Example of a data endpoint
app.get('/data', (c) => {
  return c.json({
    items: [
      { id: 1, name: 'Sample Item from Private Server' }
    ]
  })
})

app.get('/ws', upgradeWebSocket((c) => {
  return {
    onOpen(event, ws) {
      clients.add(ws);
    },
    async onMessage(event, ws) { // 1. Make this async
      try {
        const data = JSON.parse(event.data.toString());

        // 2. SAVE TO DATABASE
        // Note: Match these keys to your schema.ts
        await db.insert(messages).values({
          roomId: data.channelId || 'main-room', // Use the channel sent by client
          content: data.text,
          senderId: 'system', // For now, until you have auth working
          timestamp: new Date(),
        });

        // 3. BROADCAST to everyone else
        clients.forEach((client) => {
          if (client !== ws && client.readyState === 1) {
            client.send(JSON.stringify(data));
          }
        });
      } catch (err) {
        console.error("Failed to save/broadcast message:", err);
      }
    },
    onClose(event, ws) {
      clients.delete(ws);
    },
  }
}))


app.get('/get-voice-token', async (c) => {
  const roomName = c.req.query('room') || 'main-room';
  const participantName = 'user-' + Math.floor(Math.random() * 1000);

  // These would ideally come from your .env file
  const apiKey = 'milan_test_key' // process.env.LIVEKIT_API_KEY || 'devkey';
  const apiSecret = 'milan_test_secret_123' // process.env.LIVEKIT_API_SECRET || 'secret';

  const at = new AccessToken(apiKey, apiSecret, {
    identity: participantName,
  })

  at.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: true,
    canSubscribe: true,
    roomAdmin: true
  })

  const token = await at.toJwt();
  console.log(`Generated token for room: ${roomName} with key: ${apiKey}`);
  return c.json({ token });
})

app.post('/messages', async (c) => {
  const body = await c.req.json();

  // // 1. Save to SQLite
  const insertedMessage = await db.insert(messages).values({
    roomId: body.roomId,
    senderId: body.userId,
    content: body.content,
    timestamp: new Date(),
  }).returning();

  // 2. Broadcast to all connected WebSocket clients
  // (Assuming you have a list of active WS connections)
  // broadcastToRoom(body.roomId, insertedMessage[0]);

  return c.json(insertedMessage[0]);
});

app.get('/chat-history', async (c) => {
  try {
    const channel = c.req.query('channel');

    if (!channel) {
      return c.json({ error: "Channel query parameter is required" }, 400);
    }

    console.log(`Fetching history for channel: ${channel}`);
  // Logic: SELECT * FROM messages ORDER BY timestamp DESC LIMIT 50
  // For now, let's return a placeholder
  // const history = [
    // { id: '1', text: 'Welcome to the past!', timestamp: new Date() },
    // In real life: await db.select().from(messages).limit(50).orderBy(desc(messages.timestamp))
  // ];

  const history = await db.select()
    .from(messages)
    .where(eq(messages.roomId, channel))
    .orderBy(desc(messages.timestamp))
    .limit(50);

  return c.json(history.reverse()); // Reverse so they are in chronological order

} catch (error) {
  console.error("Database error:", error);
  return c.json({ error: "Failed to fetch history" }, 500);
}
});

app.route('/auth', authRoutes); // This makes routes like /auth/register
app.route('/chat', chatRoutes); // This makes routes like /chat/send

const port = Number(process.env.PORT) || 4000;
const hostname = '0.0.0.0';
console.log(`Server is running on http://${hostname}:${port}`)



const server = serve({
  fetch: app.fetch,
  port: 4000,
  hostname: '0.0.0.0'
})

injectWebSocket(server)