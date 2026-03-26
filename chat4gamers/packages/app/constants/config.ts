const isDev = process.env.NODE_ENV === 'development'

const DEV_API = 'http://localhost:4000'
const PROD_API = 'https://REDACTED_DOMAIN'

const DEV_WS = 'ws://localhost:4000'
const PROD_WS = 'wss://REDACTED_DOMAIN'

const DEV_LIVEKIT = 'ws://localhost:7880'
const PROD_LIVEKIT = 'wss://REDACTED_DOMAIN'

export const API_BASE = isDev ? DEV_API : PROD_API
export const WS_BASE = isDev ? DEV_WS : PROD_WS
export const LIVEKIT_WS = isDev ? DEV_LIVEKIT : PROD_LIVEKIT
