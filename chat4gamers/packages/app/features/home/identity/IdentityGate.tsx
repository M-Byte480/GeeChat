'use client'

import { useCallback, useEffect, useState } from 'react'
import type { Identity, Server } from './types'
import { deserializeFromStorage, serializeForStorage } from './crypto'
import { WelcomeScreen } from './WelcomeScreen'
import { ApiProvider } from 'app/provider/ApiProvider'
import { IdentityContext } from 'app/features/home/identity/IdentityContext'

interface ElectronAPI {
  safestoreGet: () => Promise<string | null>
  safestoreSet: (json: string) => void
  getVersion: () => Promise<string>
  processAudioFrame?: (input: Float32Array) => number[]
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}

export function IdentityGate({ children }: { children: React.ReactNode }) {
  const [identity, setIdentity] = useState<Identity | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const api = window.electronAPI
    if (api?.safestoreGet) {
      api.safestoreGet().then((json: string | null) => {
        if (json) {
          try {
            setIdentity(deserializeFromStorage(json))
          } catch {
            // Corrupted data — fall through to WelcomeScreen
          }
        }
        setMounted(true)
      })
    } else {
      // Non-Electron environments (browser, Playwright): fall back to localStorage.
      // Each browser context has isolated storage, so this naturally gives
      // separate sessions per context in tests.
      const json = localStorage.getItem('geechat-identity')
      if (json) {
        try {
          setIdentity(deserializeFromStorage(json))
        } catch {
          localStorage.removeItem('geechat-identity')
        }
      }
      setMounted(true)
    }
  }, [])

  const persist = useCallback((updated: Identity) => {
    if (window.electronAPI?.safestoreSet) {
      window.electronAPI.safestoreSet(serializeForStorage(updated))
    } else {
      localStorage.setItem('geechat-identity', serializeForStorage(updated))
    }
    setIdentity(updated)
  }, [])

  const changeUsername = useCallback(
    (name: string) => {
      const trimmed = name.trim()
      if (!trimmed || !identity) return
      persist({ ...identity, username: trimmed })
    },
    [identity, persist]
  )

  const changePfp = useCallback(
    (dataUrl: string) => {
      if (!identity) return
      persist({ ...identity, pfp: dataUrl })
    },
    [identity, persist]
  )

  const addServer = useCallback(
    (server: Server) => {
      if (!identity) return
      const already = identity.servers.some((s) => s.id === server.id)
      if (already) return
      persist({ ...identity, servers: [...identity.servers, server] })
    },
    [identity, persist]
  )

  const deleteServer = useCallback(
    (serverUrl: string) => {
      if (!identity) return
      persist({
        ...identity,
        servers: identity.servers.filter((s) => s.url !== serverUrl),
      })
    },
    [identity, persist]
  )

  if (!mounted) return null
  if (!identity) return <WelcomeScreen onIdentityReady={persist} />

  return (
    <IdentityContext.Provider
      value={{
        identity,
        changeUsername,
        changePfp,
        servers: identity.servers,
        addServer,
        deleteServer,
      }}
    >
      <ApiProvider
        identity={identity}
        onSessionExpired={(baseUrl) => {
          persist({
            ...identity,
            sessionTokens: { ...identity.sessionTokens, [baseUrl]: undefined },
          })
        }}
        persistSessionToken={(baseUrl, token) => {
          persist({
            ...identity,
            sessionTokens: { ...identity.sessionTokens, [baseUrl]: token },
          })
        }}
      >
        {children}
      </ApiProvider>
    </IdentityContext.Provider>
  )
}
