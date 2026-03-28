import { createContext, useContext } from 'react'
import type { Identity, Server } from './types'

interface IdentityContextValue {
  identity: Identity
  changeUsername: (name: string) => void
  changePfp: (dataUrl: string) => void
  servers: Server[]
  addServer: (server: Server) => void
  updateServer: (id: string, updates: Partial<Server>) => void
  deleteServer: (url: string) => void
}

export const IdentityContext = createContext<IdentityContextValue | null>(null)

export function useIdentity() {
  const ctx = useContext(IdentityContext)
  if (!ctx) throw new Error('useIdentity must be used within IdentityGate')
  return ctx
}
