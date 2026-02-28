import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { cors } from 'hono/cors'
import { AccessToken } from 'livekit-server-sdk'
import { createNodeWebSocket } from '@hono/node-ws' // <-- CHANGE TO THIS
import authRoutes from './routes/auth.js';
import chatRoutes from './routes/chat.js';
import { trimTrailingSlash } from 'hono/trailing-slash'
import { messages, channels as channelsTable } from "./db/schema.js";
import { db } from './db/index.js'; // Import the shared instance

import { eq, desc } from 'drizzle-orm';

// Strip HTML/script tags and cap message length — no external deps needed
const sanitize = (text: string): string =>
  text.replace(/<[^>]*>/g, '').trim().slice(0, 2000);

const app = new Hono()
const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app })
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
      const data = JSON.parse(event.data.toString());

      if (data.type === 'TYPING') {
        // Broadcast "User X is typing" to everyone else
        clients.forEach((client) => {
          if (client !== ws && client.readyState === 1) {
            client.send(JSON.stringify(data));
          }
        });
      }
    },
    onClose(event, ws) {
      clients.delete(ws);
    },
  }
}))


app.get('/get-voice-token', async (c) => {
  const roomName = c.req.query('room') || 'hideout';
  const participantName = c.req.query('identity') || 'user-' + Math.floor(Math.random() * 1000);

  const apiKey    = process.env.LIVEKIT_API_KEY    || 'devkey';
  const apiSecret = process.env.LIVEKIT_API_SECRET || 'secret';


  const at = new AccessToken(apiKey, apiSecret, {
    identity: participantName,
  });

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
  console.log("Request Body:", body); // See what's actually arriving

  try {
    const content = sanitize(body.content ?? '');
    if (!content) return c.json({ error: 'Empty message' }, 400);

    const [newMessage] = await db.insert(messages).values({
      roomId: body.roomId,
      senderId: body.userId,
      content,
      timestamp: new Date(),
    }).returning();

    // BROADCAST to everyone
    const payload = JSON.stringify({
      type: 'NEW_MESSAGE',
      channelId: body.roomId, // Ensure this is sent so frontend can filter
      ...newMessage           // Spread the DB result (id, content, etc)
    });

    clients.forEach((client) => {
      if (client.readyState === 1) {
        client.send(payload);
      }
    });

    return c.json(newMessage);
  } catch (err: any) {
    console.error("CRITICAL ERROR IN POST /MESSAGES:");
    console.error(err.stack || err); // This is what we need!
    return c.json({ error: err.message, stack: err.stack }, 500);  }
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

app.get('/channels', async (c) => {
  const rows = await db.select().from(channelsTable);
  return c.json(rows);
});

app.post('/channels', async (c) => {
  const { name, type } = await c.req.json();
  const id = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  if (!id || !name || !['text', 'voice'].includes(type)) {
    return c.json({ error: 'Invalid channel data' }, 400);
  }
  const existing = await db.select({ id: channelsTable.id }).from(channelsTable).where(eq(channelsTable.id, id));
  if (existing.length > 0) {
    return c.json({ error: 'Channel already exists' }, 409);
  }
  const newChannel = { id, name: name.trim(), type };
  await db.insert(channelsTable).values(newChannel);
  const payload = JSON.stringify({ type: 'CHANNEL_CREATED', channel: newChannel });
  clients.forEach(client => {
    if (client.readyState === 1) client.send(payload);
  });
  return c.json(newChannel);
});

// ── Image proxy — viewer IP never reaches the origin server ──────────────────
function isBlockedHost(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, ''); // strip IPv6 brackets
  if (['localhost', '127.0.0.1', '0.0.0.0', '::1', '169.254.169.254', '100.100.100.200', 'metadata.google.internal'].includes(h)) return true;
  if (/^10\./.test(h) || /^192\.168\./.test(h) || /^172\.(1[6-9]|2\d|3[01])\./.test(h)) return true;
  return false;
}

app.get('/proxy-image', async (c) => {
  const url = c.req.query('url');
  if (!url) return c.json({ error: 'Missing url' }, 400);

  let parsed: URL;
  try { parsed = new URL(url); } catch { return c.json({ error: 'Invalid URL' }, 400); }

  if (!['http:', 'https:'].includes(parsed.protocol)) return c.json({ error: 'Invalid protocol' }, 400);
  if (isBlockedHost(parsed.hostname)) return c.json({ error: 'Blocked host' }, 403);

  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(10_000),
      headers: { 'User-Agent': 'GeeChat-Proxy/1.0' },
    });
    const contentType = res.headers.get('content-type') ?? '';
    if (!contentType.startsWith('image/') && !contentType.startsWith('video/')) {
      return c.json({ error: 'Not media' }, 415);
    }
    const buf = await res.arrayBuffer();
    if (buf.byteLength > 10 * 1024 * 1024) return c.json({ error: 'Too large' }, 413);
    return new Response(buf, {
      headers: { 'Content-Type': contentType, 'Cache-Control': 'public, max-age=3600' },
    });
  } catch {
    return c.json({ error: 'Proxy failed' }, 502);
  }
});

app.post('/voice-state', async (c) => {
  const { channelId, participants } = await c.req.json();
  const payload = JSON.stringify({ type: 'VOICE_STATE', channelId, participants });
  clients.forEach((client) => {
    if (client.readyState === 1) client.send(payload);
  });
  return c.json({ ok: true });
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