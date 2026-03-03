import { useState, useCallback, useEffect } from 'react'
import { API_BASE, WS_BASE } from 'app/constants/config'
import { Channel, ChannelType, CHANNELS } from '../types'

export function useChannels() {
  const [channels, setChannels] = useState<Channel[]>(CHANNELS)
  const [activeChannel, setActiveChannel] = useState<Channel>(CHANNELS[0])
  const [voiceParticipants, setVoiceParticipants] = useState<Record<string, string[]>>({})
  const [connectedVoiceChannelId, setConnectedVoiceChannelId] = useState<string | null>(null)
  const [showCreateChannel, setShowCreateChannel] = useState(false)
  const [createChannelType, setCreateChannelType] = useState<ChannelType>('text')
  const [newChannelName, setNewChannelName] = useState('')

  const handleParticipantsChange = useCallback((channelId: string, participants: string[]) => {
    setVoiceParticipants(prev => ({ ...prev, [channelId]: participants }))
  }, [])

  // Single click: just view the channel, never auto-join voice
  const handleChannelSelect = useCallback((channel: Channel) => {
    setActiveChannel(channel)
  }, [])

  // Double click on a voice channel: actually join the call
  const handleVoiceJoin = useCallback((channel: Channel) => {
    setActiveChannel(channel)
    setConnectedVoiceChannelId(channel.id)
  }, [])

  const handleVoiceDisconnect = useCallback(() => {
    setConnectedVoiceChannelId(null)
  }, [])

  const handleOpenCreateChannel = useCallback((type: ChannelType) => {
    setCreateChannelType(type)
    setNewChannelName('')
    setShowCreateChannel(true)
  }, [])

  const handleCreateChannel = useCallback(async () => {
    const name = newChannelName.trim()
    if (!name) return
    try {
      await fetch(`${API_BASE}/channels`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, type: createChannelType }),
      })
      setShowCreateChannel(false)
    } catch {}
  }, [newChannelName, createChannelType])

  // Fetch channel list on mount
  useEffect(() => {
    fetch(`${API_BASE}/channels`)
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setChannels(data) })
      .catch(() => {})
  }, [])

  // WebSocket listener for voice state and new channel broadcasts
  useEffect(() => {
    const ws = new WebSocket(`${WS_BASE}/ws`)
    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        if (msg.type === 'VOICE_STATE') {
          setVoiceParticipants(prev => ({ ...prev, [msg.channelId]: msg.participants }))
        }
        if (msg.type === 'CHANNEL_CREATED') {
          setChannels(prev => {
            if (prev.find(ch => ch.id === msg.channel.id)) return prev
            return [...prev, msg.channel]
          })
        }
      } catch {}
    }
    return () => ws.close()
  }, [])

  return {
    channels,
    activeChannel,
    voiceParticipants,
    connectedVoiceChannelId,
    showCreateChannel,
    setShowCreateChannel,
    createChannelType,
    newChannelName,
    setNewChannelName,
    handleParticipantsChange,
    handleChannelSelect,
    handleVoiceJoin,
    handleVoiceDisconnect,
    handleOpenCreateChannel,
    handleCreateChannel,
  }
}
