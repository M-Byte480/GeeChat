import { Hono } from 'hono'
import { AccessToken } from 'livekit-server-sdk'
import { broadcast } from '../ws.js'
import { requireAuth, requireMember } from '../lib/middleware.js'

const router = new Hono()

router.get('/get-voice-token', requireAuth, requireMember, async (c) => {
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
  })

  const token = await at.toJwt()
  console.log(`Generated token for room: ${roomName} with key: ${apiKey}`)
  return c.json({ token })
})

router.post('/voice-state', requireAuth, requireMember, async (c) => {
  const { channelId, participants } = await c.req.json()

  if (
    typeof channelId !== 'string' ||
    channelId.length === 0 ||
    channelId.length > 100
  ) {
    return c.json({ error: 'Invalid channelId' }, 400)
  }
  if (!Array.isArray(participants) || participants.length > 50) {
    return c.json({ error: 'Invalid participants' }, 400)
  }

  broadcast(JSON.stringify({ type: 'VOICE_STATE', channelId, participants }))
  return c.json({ ok: true })
})

export default router
