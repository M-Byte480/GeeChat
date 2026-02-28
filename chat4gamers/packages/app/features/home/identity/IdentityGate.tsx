'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Identity } from './types'
import { deserializeFromStorage, serializeForStorage } from './crypto'
import { WelcomeScreen } from './WelcomeScreen'

type Props = {
  children: (identity: Identity, changeUsername: (name: string) => void) => React.ReactNode
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
        } catch {
          // Corrupted data — fall through to WelcomeScreen
        }
      }
      setMounted(true)
    })
  }, [])

  const changeUsername = useCallback((name: string) => {
    const trimmed = name.trim()
    if (!trimmed || !identity) return
    const updated = { ...identity, username: trimmed }
    ;(window as any).electronAPI?.safestoreSet(serializeForStorage(updated))
    setIdentity(updated)
  }, [identity])

  if (!mounted) return null

  if (!identity) {
    return <WelcomeScreen onIdentityReady={setIdentity} />
  }

  return <>{children(identity, changeUsername)}</>
}
