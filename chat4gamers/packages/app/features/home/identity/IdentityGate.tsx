'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Identity, Server } from './types'
import { deserializeFromStorage, serializeForStorage } from './crypto'
import { WelcomeScreen } from './WelcomeScreen'

type Props = {
  children: (
    identity: Identity,
    changeUsername: (name: string) => void,
    servers: Server[],
    addServer: (server: Server) => void,
    deleteServer: (serverId: string) => void
  ) => React.ReactNode
}

export function IdentityGate({ children }: Props) {
  const [identity, setIdentity] = useState<Identity | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const api = (window as any).electronAPI
    if (!api?.safestoreGet) {
      setMounted(true)
      return
    }
    api.safestoreGet().then((json: string | null) => {
      if (json) {
        try {
          setIdentity(deserializeFromStorage(json))
          console.log(deserializeFromStorage(json))
        } catch {
          // Corrupted data — fall through to WelcomeScreen
        }
      }
      setMounted(true)
    })
  }, [])

  const persist = useCallback((updated: Identity) => {
    ;(window as any).electronAPI?.safestoreSet(serializeForStorage(updated))
    setIdentity(updated)
  }, [])

  const changeUsername = useCallback((name: string) => {
    const trimmed = name.trim()
    if (!trimmed || !identity) return
    persist({ ...identity, username: trimmed })
  }, [identity, persist])

  const addServer = useCallback((server: Server) => {
    if (!identity) return
    const already = identity.servers.some(s => s.id === server.id)
    if (already) return
    persist({ ...identity, servers: [...identity.servers, server] })
  }, [identity, persist])

  const deleteServer = useCallback((serverUrl: string) => {
    if (!identity) return
    persist({ ...identity, servers: identity.servers.filter(s => s.url !== serverUrl) })
  }, [identity, persist])

  if (!mounted) return null

  if (!identity) {
    return <WelcomeScreen onIdentityReady={setIdentity} />
  }

  return <>{children(identity, changeUsername, identity.servers, addServer, deleteServer)}</>
}
