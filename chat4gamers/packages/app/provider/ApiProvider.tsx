import { useEffect, useRef } from 'react'
import { configureAvatarStorage, configureClient } from '@my/api-client'
import { Identity } from 'app/features/home/identity'
import { signChallenge } from 'app/features/home/identity/crypto'

configureAvatarStorage({
  getItem: async (key) => localStorage.getItem(key),
  setItem: async (key, value) => localStorage.setItem(key, value),
})

interface ApiProviderProps {
  children: React.ReactNode
  identity: Identity | null
  onSessionExpired: (baseUrl: string) => void
  persistSessionToken: (baseUrl: string, token: string) => void
}

export function ApiProvider({
  children,
  identity,
  onSessionExpired,
  persistSessionToken,
}: ApiProviderProps) {
  // Always-current ref so getSessionToken always reads the latest sessionTokens
  // even though configureClient only re-runs when the publicKey changes
  const identityRef = useRef(identity)
  identityRef.current = identity

  useEffect(() => {
    if (
      typeof Notification !== 'undefined' &&
      Notification.permission === 'default'
    ) {
      Notification.requestPermission().then((r) =>
        console.warn('Notification permission:', r)
      )
    }
  }, [])

  useEffect(() => {
    if (!identity) return

    configureClient({
      publicKey: identity.publicKey,
      signChallenge: (challenge) =>
        signChallenge(identity.privateKeyBytes, challenge),
      getSessionToken: (baseUrl) =>
        identityRef.current?.sessionTokens[baseUrl] ?? null,
      setSessionToken: (baseUrl, token) => persistSessionToken(baseUrl, token),
      onSessionExpired,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identity?.publicKey])

  return <>{children}</>
}
