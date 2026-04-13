import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { cors } from 'hono/cors'
import { trimTrailingSlash } from 'hono/trailing-slash'

import messagesRouter from './routes/messages.js'
import channelsRouter from './routes/channels.js'
import voiceRouter from './routes/voice.js'
import proxyRouter from './routes/proxy.js'
import authRoutes from './routes/auth.js'
import chatRoutes from './routes/chat.js'
import membersRouter from './routes/members.js'
import relayRouter from './routes/relay.js'
import media from './routes/media.js'
import rolesRouter from './routes/roles.js'
import adminRouter from './routes/admin.js'
import gifsRouter from './routes/gifs.js'

/**
 * Creates and configures the Hono application without starting a server.
 * This separation allows tests to call `app.request()` directly without
 * binding to a port, while `index.ts` adds the WebSocket layer and calls
 * `serve()` for production.
 */
export function createApp() {
  const app = new Hono()

  app.use('*', trimTrailingSlash())
  app.use('*', logger())
  app.use(
    '*',
    cors({ origin: '*', allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'] })
  )

  app.get('/', (c) =>
    c.json({
      status: 'online',
      message: 'Private Server Instance Ready',
      version: '1.0.0',
      gifEnabled: !!process.env.KLIPY_API_KEY,
    })
  )

  app.route('/', messagesRouter)
  app.route('/', channelsRouter)
  app.route('/', voiceRouter)
  app.route('/', proxyRouter)
  app.route('/auth', authRoutes)
  app.route('/chat', chatRoutes)
  app.route('/', membersRouter)
  app.route('/', relayRouter)
  app.route('/', media)
  app.route('/', rolesRouter)
  app.route('/', adminRouter)
  app.route('/', gifsRouter)

  return app
}
