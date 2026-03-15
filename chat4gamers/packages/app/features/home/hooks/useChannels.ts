import { useState, useCallback } from 'react'
import { Channel } from '../types/types'
import { useAppStore } from 'app/features/home/hooks/useAppStore'

export function useChannels(serverUrl: string | null) {
  const setVoiceParticipants = useAppStore(s => s.setVoiceParticipants)

  const [activeChannel, setActiveChannel] = useState<Channel>({} as Channel)
  const [connectedVoiceChannelId, setConnectedVoiceChannelId] = useState<string | null>(null)

  const handleParticipantsChange = useCallback((channelId: string, participants: string[]) => {
    if (serverUrl) setVoiceParticipants(serverUrl, channelId, participants)
  }, [serverUrl, setVoiceParticipants])

  const handleChannelSelect = useCallback((channel: Channel) => {
    setActiveChannel(channel)
  }, [])

  const handleVoiceJoin = useCallback((channel: Channel) => {
    setActiveChannel(channel)
    setConnectedVoiceChannelId(channel.id)
  }, [])

  const handleVoiceDisconnect = useCallback(() => {
    setConnectedVoiceChannelId(null)
  }, [])

  return {
    activeChannel,
    connectedVoiceChannelId,
    handleChannelSelect,
    handleVoiceJoin,
    handleVoiceDisconnect,
    handleParticipantsChange,
    setActiveChannel,
    setConnectedVoiceChannelId,
  }
}
