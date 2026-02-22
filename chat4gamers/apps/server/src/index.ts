import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { cors } from 'hono/cors'
import { AccessToken } from 'livekit-server-sdk'
import { upgradeWebSocket } from "hono/cloudflare-workers"; // Need to figure out what this clourdflare worker is?
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3-multiple-ciphers';
import authRoutes from './routes/auth.js';
import chatRoutes from './routes/chat.js';

const sqlite = new Database('chat.db');
const db = drizzle(sqlite);
const app = new Hono()

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
    onMessage(event, ws) {
      console.log(`Message from client: ${event.data}`)
    },
    onClose: () => console.log('Connection closed'),
  }
}))

app.get('/get-voice-token', async (c) => {
  const roomName = c.req.query('room') || 'main-room';
  const participantName = 'user-' + Math.floor(Math.random() * 1000);

  // These would ideally come from your .env file
  const apiKey = 'REDACTED_LIVEKIT_KEY' // process.env.LIVEKIT_API_KEY || 'devkey';
  const apiSecret = 'REDACTED_LIVEKIT_SECRET' // process.env.LIVEKIT_API_SECRET || 'secret';

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
  // const insertedMessage = await db.insert(messages).values({
  //   roomId: body.roomId,
  //   senderId: body.userId,
  //   content: body.content,
  //   timestamp: new Date(),
  // }).returning();

  // 2. Broadcast to all connected WebSocket clients
  // (Assuming you have a list of active WS connections)
  // broadcastToRoom(body.roomId, insertedMessage[0]);

  // return c.json(insertedMessage[0]);
});

app.route('/auth', authRoutes); // This makes routes like /auth/register
app.route('/chat', chatRoutes); // This makes routes like /chat/send

const port = Number(process.env.PORT) || 4000;
const hostname = '0.0.0.0';
console.log(`Server is running on http://${hostname}:${port}`)



serve({
  fetch: app.fetch,
  port,
  hostname: hostname
})