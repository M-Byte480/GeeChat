// Shared WebSocket client registry — imported by route handlers that need to broadcast
export const clients = new Set<any>()

/** Send a JSON string to every connected client */
export function broadcast(payload: string) {
  clients.forEach(client => {
    if (client.readyState === 1) client.send(payload)
  })
}

/** Register the /ws upgrade route on the given Hono app */
export function registerWsRoute(app: any, upgradeWebSocket: any) {
  app.get('/ws', upgradeWebSocket(() => ({
    onOpen(_e: any, ws: any) {
      clients.add(ws)
    },
    onMessage(event: any, ws: any) {
      const data = JSON.parse(event.data.toString())
      if (data.type === 'TYPING') {
        clients.forEach(client => {
          if (client !== ws && client.readyState === 1) {
            client.send(JSON.stringify(data))
          }
        })
      }
    },
    onClose(_e: any, ws: any) {
      clients.delete(ws)
    },
  })))
}
