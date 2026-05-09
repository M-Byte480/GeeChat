// Shared WebSocket client registry — imported by route handlers that need to broadcast

import { requireWsAuth } from './lib/middleware.js'

interface WsClient {
  readyState: number
  send: (data: string) => void
  close: () => void
}

export type PresenceStatus = 'online' | 'away' | 'do_not_disturb' | 'offline'

interface PresenceEntry {
  status: PresenceStatus
  lastSeen: number
  // non-null while user has manually set a status; server skips auto-away for these
  manualStatus: PresenceStatus | null
}

export const clients = new Set<WsClient>()

// publicKey → WebSocket, for targeted DM delivery
export const clientsByKey = new Map<string, WsClient>()

// publicKey → presence, ephemeral in-memory only (resets on server restart)
export const presenceMap = new Map<string, PresenceEntry>()

const AWAY_THRESHOLD_MS = 5 * 60 * 1000 // 5 minutes

// Demote idle users to away every 60 s
setInterval(() => {
  const now = Date.now()
  for (const [publicKey, entry] of presenceMap) {
    if (entry.manualStatus !== null) continue
    if (entry.status === 'online' && now - entry.lastSeen > AWAY_THRESHOLD_MS) {
      entry.status = 'away'
      broadcast(JSON.stringify({ type: 'STATUS_CHANGED', publicKey, status: 'away' }))
    }
  }
}, 60_000)

/** Send a JSON string to every connected client */
export function broadcast(payload: string) {
  clients.forEach((client) => {
    if (client.readyState === 1) client.send(payload)
  })
}

/** Send a JSON string to a specific user. Returns true if delivered. */
export function sendToUser(publicKey: string, payload: string): boolean {
  const client = clientsByKey.get(publicKey)
  if (client && client.readyState === 1) {
    client.send(payload)
    return true
  }
  return false
}

/** Register the /ws upgrade route on the given Hono app */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function registerWsRoute(app: any, upgradeWebSocket: any) {
  app.get(
    '/ws',
    requireWsAuth,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    upgradeWebSocket((c: any) => {
      const user = c.get('user')
      return {
        onOpen(_e: unknown, ws: WsClient) {
          clients.add(ws)
          if (user?.publicKey) {
            clientsByKey.set(user.publicKey, ws)
            presenceMap.set(user.publicKey, {
              status: 'online',
              lastSeen: Date.now(),
              manualStatus: null,
            })
            broadcast(JSON.stringify({ type: 'STATUS_CHANGED', publicKey: user.publicKey, status: 'online' }))
          }
        },
        onMessage(event: { data: { toString: () => string } }, ws: WsClient) {
          const data = JSON.parse(event.data.toString())

          if (data.type === 'TYPING') {
            clients.forEach((client) => {
              if (client !== ws && client.readyState === 1) {
                client.send(JSON.stringify(data))
              }
            })
          } else if (data.type === 'HEARTBEAT' && user?.publicKey) {
            const entry = presenceMap.get(user.publicKey)
            if (entry) {
              const wasAway = entry.status === 'away'
              entry.lastSeen = Date.now()
              if (wasAway && entry.manualStatus === null) {
                entry.status = 'online'
                broadcast(JSON.stringify({ type: 'STATUS_CHANGED', publicKey: user.publicKey, status: 'online' }))
              }
            }
          } else if (data.type === 'SET_STATUS' && user?.publicKey) {
            const requested = data.status as PresenceStatus
            const allowed: PresenceStatus[] = ['online', 'away', 'do_not_disturb']
            if (!allowed.includes(requested)) return
            const entry = presenceMap.get(user.publicKey)
            if (!entry) return
            // 'online' clears manual override so the server resumes auto-management
            entry.manualStatus = requested === 'online' ? null : requested
            entry.status = requested
            entry.lastSeen = Date.now()
            broadcast(JSON.stringify({ type: 'STATUS_CHANGED', publicKey: user.publicKey, status: requested }))
          }
        },
        onClose(_e: unknown, ws: WsClient) {
          clients.delete(ws)
          for (const [key, client] of clientsByKey) {
            if (client === ws) {
              clientsByKey.delete(key)
              presenceMap.delete(key)
              broadcast(JSON.stringify({ type: 'STATUS_CHANGED', publicKey: key, status: 'offline' }))
              break
            }
          }
        },
      }
    })
  )
}
