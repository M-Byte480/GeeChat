import {useCallback, useEffect, useMemo, useState} from 'react'
import {Channel} from '../types/types'
import {useAppStore} from 'app/features/home/hooks/useAppStore'

const EMPTY_CHANNELS: Channel[] = []
const EMPTY_CHANNEL: Channel = {} as Channel

export function useChannels(serverUrl: string | null) {
    const setVoiceParticipants = useAppStore((s) => s.setVoiceParticipants)
    const channels = useAppStore(
        (s) => s.cache[serverUrl ?? '']?.channels ?? EMPTY_CHANNELS
    )

    const [activeChannelId, setActiveChannelId] = useState<string | null>(null)
    const [connectedVoiceChannelId, setConnectedVoiceChannelId] = useState<
        string | null
    >(null)

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
        setConnectedVoiceChannelId(channel.id)
    }, [])

    const handleVoiceDisconnect = useCallback(() => {
        setConnectedVoiceChannelId(null)
    }, [])

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
