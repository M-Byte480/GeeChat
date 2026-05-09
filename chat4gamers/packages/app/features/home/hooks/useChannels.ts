import { useCallback, useEffect, useMemo, useState } from 'react'
import { Channel } from '../types/types'
import { useAppStore } from 'app/features/home/hooks/useAppStore'

const EMPTY_CHANNELS: Channel[] = []
const EMPTY_CHANNEL: Channel = {} as Channel

export function useChannels(serverUrl: string | null) {
  const setVoiceParticipants = useAppStore((s) => s.setVoiceParticipants)
  const voiceConnection = useAppStore((s) => s.voiceConnection)
  const setVoiceConnection = useAppStore((s) => s.setVoiceConnection)
  const channels = useAppStore(
    (s) => s.cache[serverUrl ?? '']?.channels ?? EMPTY_CHANNELS
  )

  const [activeChannelId, setActiveChannelId] = useState<string | null>(null)

  // Highlighted in the sidebar only when in a call on this specific server
  const connectedVoiceChannelId =
    voiceConnection?.serverUrl === serverUrl ? voiceConnection.channelId : null

  // Auto-select first channel when channels load and none is selected
  useEffect(() => {
    if (channels.length > 0 && !activeChannelId) {
      setActiveChannelId(channels[0]?.id ?? null)
    }
  }, [channels, activeChannelId])

  // Reset active channel when server changes
  useEffect(() => {
    setActiveChannelId(null)
  }, [serverUrl])

  const activeChannel = useMemo(
    () => channels.find((c) => c.id === activeChannelId) ?? EMPTY_CHANNEL,
    [channels, activeChannelId]
  )

  const handleChannelSelect = useCallback((channel: Channel) => {
    setActiveChannelId(channel.id)
  }, [])

  const handleVoiceJoin = useCallback((channel: Channel) => {
    setActiveChannelId(channel.id)
    if (serverUrl) setVoiceConnection({ serverUrl, channelId: channel.id })
  }, [serverUrl, setVoiceConnection])

  const handleVoiceDisconnect = useCallback(() => {
    setVoiceConnection(null)
  }, [setVoiceConnection])

  const handleParticipantsChange = useCallback(
    (channelId: string, participants: string[]) => {
      if (serverUrl) setVoiceParticipants(serverUrl, channelId, participants)
    },
    [serverUrl, setVoiceParticipants]
  )

  return {
    activeChannel,
    connectedVoiceChannelId,
    handleChannelSelect,
    handleVoiceJoin,
    handleVoiceDisconnect,
    handleParticipantsChange,
  }
}
