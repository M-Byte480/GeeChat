export interface User {
  publicKey: string
  username: string
  status: 'pending' | 'member' | 'banned'
}

export interface ClientConfig {
  publicKey: string
  signChallenge: SignChallengeFn
  getSessionToken: (baseUrl: string) => string | null
  setSessionToken: (baseUrl: string, token: string) => void
  onSessionExpired: (baseUrl: string) => void
}

export type SignChallengeFn = (challenge: string) => Promise<string>
