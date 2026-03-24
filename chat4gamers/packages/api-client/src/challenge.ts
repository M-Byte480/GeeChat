import type { ClientConfig, SignChallengeFn } from './types'
const authenticatingServers = new Map<string, Promise<string | null>>()

const _publicKey: string | null = null
const _signChallenge: SignChallengeFn | null = null
let _config: ClientConfig | null = null

export function configureClient(config: ClientConfig) {
  console.log('[api-client] configureClient called, publicKey:', config.publicKey?.slice(0, 10))

  _config = config
}

export function getConfig(): ClientConfig {
  if (!_config) throw new Error('api-client not configured — call configureClient first')
  return _config
}

export function getPublicKey(): string {
  if (!_publicKey) throw new Error('api-client not configured')
  return _publicKey
}

export async function refreshSession(baseUrl: string): Promise<string> {
  const { publicKey, signChallenge, setSessionToken } = getConfig()

  const { challenge } = await fetch(`${baseUrl}/auth/challenge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ publicKey }),
  }).then((r) => r.json())

  const signature = await signChallenge(challenge)

  const { token } = await fetch(`${baseUrl}/auth/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ publicKey, signature }),
  }).then((r) => r.json())

  setSessionToken(baseUrl, token)
  return token
}

export async function authenticate(baseUrl: string): Promise<string | null> {
  const { getSessionToken } = getConfig()
  const existing = getSessionToken(baseUrl)
  if (existing) return existing

  // If already authenticating for this server, wait for that instead
  const inFlight = authenticatingServers.get(baseUrl)
  if (inFlight) return inFlight

  const promise = refreshSession(baseUrl).finally(() => {
    authenticatingServers.delete(baseUrl)
  })

  authenticatingServers.set(baseUrl, promise)
  return promise
}
