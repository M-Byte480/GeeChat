// Shared WebSocket client registry — imported by route handlers that need to broadcast

import { requireWsAuth } from './lib/middleware.js'

interface WsClient {
  readyState: number
  send: (data: string) => void
  close: () => void
}

export const clients = new Set<WsClient>()

// publicKey → WebSocket, for targeted DM delivery
export const clientsByKey = new Map<string, WsClient>()

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
    upgradeWebSocket((c: any) => {
      const user = c.get('user')
      return {
        onOpen(_e: unknown, ws: WsClient) {
          clients.add(ws)
          if (user?.publicKey) {
            clientsByKey.set(user.publicKey, ws)
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
          }
        },
        onClose(_e: unknown, ws: WsClient) {
          clients.delete(ws)
          for (const [key, client] of clientsByKey) {
            if (client === ws) {
              clientsByKey.delete(key)
              break
            }
          }
        },
      }
    })
  )
}
