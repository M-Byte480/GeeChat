import { serve } from '@hono/node-server'
import { createNodeWebSocket } from '@hono/node-ws'

import { createApp } from './app.js'
import { registerWsRoute } from './ws.js'
import { initServerState } from './server-state.js'
import { db } from './db/index.js'

const app = createApp()
const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app })
registerWsRoute(app, upgradeWebSocket)

const port = parseInt(process.env.PORT ?? '4000', 10)
const server = serve({ fetch: app.fetch, port, hostname: '0.0.0.0' })
injectWebSocket(server)
await initServerState(db)

console.log(`Server is running on http://0.0.0.0:${port}`)
