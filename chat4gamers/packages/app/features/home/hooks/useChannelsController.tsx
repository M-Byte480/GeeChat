import { useEffect } from 'react'
import { useAppStore } from 'app/features/home/hooks/useAppStore'
import { apiFetch, getConfig, invalidateUser } from '@my/api-client'

function deriveWsBase(url: string): string {
  return url.replace(/^https:\/\//, 'wss://').replace(/^http:\/\//, 'ws://')
}

export function useChannelsController(serverUrl: string | null) {
  const setChannels = useAppStore((s) => s.setChannels)

  useEffect(() => {
    if (!serverUrl) return

    apiFetch(`${serverUrl}`, `/channels`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setChannels(serverUrl, data)
      })
      .catch(() => {})
  }, [serverUrl, setChannels])

  useEffect(() => {
    if (!serverUrl) return
    const token = getConfig().getSessionToken(serverUrl)
    const ws = new WebSocket(deriveWsBase(serverUrl) + `/ws?token=${token}`)
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data)
      if (msg.type === 'CHANNEL_CREATED') {
        apiFetch(`${serverUrl}`, `/channels`)
          .then((r) => r.json())
          .then((data) => {
            if (Array.isArray(data)) setChannels(serverUrl, data)
          })
          .catch(() => {})
      } else if (msg.type === 'PROFILE_UPDATED' && msg.publicKey) {
        invalidateUser(msg.publicKey)
      }
    }
    return () => ws.close()
  }, [serverUrl, setChannels])
}
