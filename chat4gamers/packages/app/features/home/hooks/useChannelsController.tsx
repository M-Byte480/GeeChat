import { useEffect } from 'react'
import { useAppStore } from 'app/features/home/hooks/useAppStore'
import { apiFetch, invalidateUser } from '@my/api-client'
import { useServerSocket } from './useServerSocket'
import { useIdentity } from 'app/features/home/identity/IdentityContext'
import type { Channel } from 'app/features/home/types/types'

export function useChannelsController(serverUrl: string | null) {
  const setChannels = useAppStore((s) => s.setChannels)
  const setGifEnabled = useAppStore((s) => s.setGifEnabled)
  const setActiveServerUrl = useAppStore((s) => s.setActiveServerUrl)
  const { deleteServer } = useIdentity()

  useEffect(() => {
    if (!serverUrl) return

    apiFetch(`${serverUrl}`, `/channels`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setChannels(serverUrl, data)
      })
      .catch(() => {})

    // Fetch server status to get gifEnabled flag (no auth needed)
    fetch(`${serverUrl}/`)
      .then((r) => r.json())
      .then((data: { gifEnabled?: boolean }) => {
        setGifEnabled(serverUrl, !!data.gifEnabled)
      })
      .catch(() => {})
  }, [serverUrl, setChannels, setGifEnabled])

  const setVoiceParticipants = useAppStore((s) => s.setVoiceParticipants)

  useServerSocket(serverUrl, (msg) => {
    if (msg.type === 'CHANNEL_CREATED' && msg.channel && serverUrl) {
      const current = useAppStore.getState().cache[serverUrl]?.channels ?? []
      setChannels(serverUrl, [...current, msg.channel as Channel])
    } else if (msg.type === 'VOICE_STATE' && serverUrl) {
      // Sync voice participant list broadcast by a peer when they join/leave
      setVoiceParticipants(serverUrl, msg.channelId as string, msg.participants as string[])
    } else if (msg.type === 'PROFILE_UPDATED' && msg.publicKey) {
      invalidateUser(msg.publicKey as string)
    } else if ((msg.type === 'KICKED' || msg.type === 'BANNED') && serverUrl) {
      // Remove this server from the identity and navigate away
      setActiveServerUrl(null)
      deleteServer(serverUrl)
    }
  })
}
