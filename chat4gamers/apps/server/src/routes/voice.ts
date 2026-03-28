import { Hono } from 'hono'
import { AccessToken } from 'livekit-server-sdk'
import { broadcast } from '../ws.js'
import { requireAuth } from '../lib/middleware.js'

const router = new Hono()

router.get('/get-voice-token', requireAuth, async (c) => {
  const roomName = c.req.query('room') || 'hideout'
  const participantName =
    c.req.query('identity') || 'user-' + Math.floor(Math.random() * 1000)
  const apiKey = process.env.LIVEKIT_API_KEY || 'devkey'
  const apiSecret = process.env.LIVEKIT_API_SECRET || 'secret'

  const at = new AccessToken(apiKey, apiSecret, { identity: participantName })
  at.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: true,
    canSubscribe: true,
    roomAdmin: true,
  })

  const token = await at.toJwt()
  console.log(`Generated token for room: ${roomName} with key: ${apiKey}`)
  return c.json({ token })
})

router.post('/voice-state', async (c) => {
  const { channelId, participants } = await c.req.json()
  broadcast(JSON.stringify({ type: 'VOICE_STATE', channelId, participants }))
  return c.json({ ok: true })
})

export default router
