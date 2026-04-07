'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Identity, Server } from './types'
import { deserializeFromStorage, serializeForStorage } from './crypto'
import { WelcomeScreen } from './WelcomeScreen'
import { ApiProvider } from 'app/provider/ApiProvider'
import { IdentityContext } from 'app/features/home/identity/IdentityContext'
import { apiFetch } from '@my/api-client'

function syncProfileToServers(
  servers: Server[],
  body: Record<string, unknown>
) {
  for (const server of servers) {
    if (!server.pending) {
      apiFetch(server.url, '/profile', {
        method: 'PATCH',
        body: JSON.stringify(body),
      }).catch(() => {})
    }
  }
}

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
  // Always-current ref so stable callbacks (configureClient) never close over stale identity
  const identityRef = useRef(identity)
  useEffect(() => {
    identityRef.current = identity
  })

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
      // Tauri and browser environments: use localStorage.
      // In Tauri, the WebView persists localStorage per-app under its own origin
      // (tauri://localhost in production), giving natural isolation.
      // File I/O (import/export identity) is handled via web file-picker APIs
      // in WelcomeScreen — no native plugin required.
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
      syncProfileToServers(identity.servers, { username: trimmed })
    },
    [identity, persist]
  )

  const changePfp = useCallback(
    (dataUrl: string) => {
      if (!identity) return
      persist({ ...identity, pfp: dataUrl })
      syncProfileToServers(identity.servers, { pfp: dataUrl })
    },
    [identity, persist]
  )

  const changeProfile = useCallback(
    (username: string, pfp?: string) => {
      const trimmed = username.trim()
      if (!trimmed || !identity) return
      const updated = {
        ...identity,
        username: trimmed,
        ...(pfp !== undefined ? { pfp } : {}),
      }
      persist(updated)
      const syncPayload: Record<string, unknown> = { username: trimmed }
      if (pfp !== undefined) syncPayload.pfp = pfp
      syncProfileToServers(identity.servers, syncPayload)
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

  const updateServer = useCallback(
    (id: string, updates: Partial<Server>) => {
      if (!identity) return
      persist({
        ...identity,
        servers: identity.servers.map((s) =>
          s.id === id ? { ...s, ...updates } : s
        ),
      })
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
        updateServer,
        deleteServer,
        changeProfile,
      }}
    >
      <ApiProvider
        identity={identity}
        onSessionExpired={(baseUrl) => {
          const cur = identityRef.current
          if (!cur) return
          persist({
            ...cur,
            sessionTokens: { ...cur.sessionTokens, [baseUrl]: undefined },
          })
        }}
        persistSessionToken={(baseUrl, token) => {
          const cur = identityRef.current
          if (!cur) return
          persist({
            ...cur,
            sessionTokens: { ...cur.sessionTokens, [baseUrl]: token },
          })
        }}
      >
        {children}
      </ApiProvider>
    </IdentityContext.Provider>
  )
}
