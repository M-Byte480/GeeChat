import { useEffect } from 'react'
import { useAppStore } from 'app/features/home/hooks/useAppStore'
import { apiFetch, invalidateUser } from '@my/api-client'
import { useServerSocket } from './useServerSocket'
import type { Channel } from 'app/features/home/types/types'

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

  useServerSocket(serverUrl, (msg) => {
    if (msg.type === 'CHANNEL_CREATED' && msg.channel && serverUrl) {
      // Append the new channel directly from the WS payload — no re-fetch needed
      const current = useAppStore.getState().cache[serverUrl]?.channels ?? []
      setChannels(serverUrl, [...current, msg.channel as Channel])
    } else if (msg.type === 'PROFILE_UPDATED' && msg.publicKey) {
      invalidateUser(msg.publicKey as string)
    }
  })
}
