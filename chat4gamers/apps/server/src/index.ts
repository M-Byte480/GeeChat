import {serve} from '@hono/node-server'
import {Hono} from 'hono'
import {logger} from 'hono/logger'
import {cors} from 'hono/cors'
import {createNodeWebSocket} from '@hono/node-ws'
import {trimTrailingSlash} from 'hono/trailing-slash'

import {registerWsRoute} from './ws.js'
import messagesRouter from './routes/messages.js'
import channelsRouter from './routes/channels.js'
import voiceRouter from './routes/voice.js'
import proxyRouter from './routes/proxy.js'
import authRoutes from './routes/auth.js'
import chatRoutes from './routes/chat.js'
import membersRouter from './routes/members.js'
import relayRouter from './routes/relay.js'
import media from './routes/media.js'
import {initServerState} from './server-state.js'
import {db} from './db/index.js'

const app = new Hono()
const {injectWebSocket, upgradeWebSocket} = createNodeWebSocket({app})

app.use('*', trimTrailingSlash())
app.use('*', logger())
app.use('*', cors({origin: '*', allowMethods: ['GET', 'POST', 'OPTIONS']}))

app.get('/', (c) =>
    c.json({
        status: 'online',
        message: 'Private Server Instance Ready',
        version: '1.0.0',
    })
)

registerWsRoute(app, upgradeWebSocket)

app.route('/', messagesRouter)
app.route('/', channelsRouter)
app.route('/', voiceRouter)
app.route('/', proxyRouter)
app.route('/auth', authRoutes)
app.route('/chat', chatRoutes)
app.route('/', membersRouter)
app.route('/', relayRouter)
app.route('/', media)

const server = serve({fetch: app.fetch, port: 4000, hostname: '0.0.0.0'})
injectWebSocket(server)
await initServerState(db)

console.log('Server is running on http://0.0.0.0:4000')
