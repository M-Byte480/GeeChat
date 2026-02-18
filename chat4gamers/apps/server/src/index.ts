import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { cors } from 'hono/cors'
import { AccessToken } from 'livekit-server-sdk'

const app = new Hono()

// Middlewares
app.use('*', logger()) // Log requests to console
app.use('*', cors())   // Allow your Electron app to talk to this API

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

app.get('/get-voice-token', async (c) => {
  const roomName = c.req.query('room') || 'main-room'
  const participantName = 'user-' + Math.floor(Math.random() * 1000)

  // These would ideally come from your .env file
  const apiKey = 'REDACTED_LIVEKIT_KEY' // process.env.LIVEKIT_API_KEY || 'devkey';
  const apiSecret = 'REDACTED_LIVEKIT_SECRET' // process.env.LIVEKIT_API_SECRET || 'secret';

  const at = new AccessToken(apiKey, apiSecret, {
    identity: participantName,
  })

  at.addGrant({ roomJoin: true, room: roomName, canPublish: true, canSubscribe: true })

  return c.json({ token: await at.toJwt() })
})

const port = Number(process.env.PORT) || 4000;
const hostname = '0.0.0.0';
console.log(`Server is running on http://${hostname}:${port}`)

serve({
  fetch: app.fetch,
  port,
  hostname: hostname
})