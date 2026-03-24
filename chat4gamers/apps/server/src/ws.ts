// Shared WebSocket client registry — imported by route handlers that need to broadcast
export const clients = new Set<any>()

// publicKey → WebSocket, for targeted DM delivery
export const clientsByKey = new Map<string, any>()

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
export function registerWsRoute(app: any, upgradeWebSocket: any) {
  app.get(
    '/ws',
    upgradeWebSocket(() => ({
      onOpen(_e: any, ws: any) {
        clients.add(ws)
      },
      onMessage(event: any, ws: any) {
        const data = JSON.parse(event.data.toString())
        if (data.type === 'TYPING') {
          clients.forEach((client) => {
            if (client !== ws && client.readyState === 1) {
              client.send(JSON.stringify(data))
            }
          })
        } else if (data.type === 'REGISTER' && data.publicKey) {
          clientsByKey.set(data.publicKey, ws)
        }
      },
      onClose(_e: any, ws: any) {
        clients.delete(ws)
        for (const [key, client] of clientsByKey) {
          if (client === ws) {
            clientsByKey.delete(key)
            break
          }
        }
      },
    }))
  )
}
