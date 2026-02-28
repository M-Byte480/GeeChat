'use client'

import { XStack, YStack, Sheet, Button, Text, Input, Paragraph } from '@my/ui'
import { Menu, Volume2, Settings, Pencil } from '@tamagui/lucide-icons'
import { useState, useCallback, useEffect } from 'react'
import { WS_BASE, API_BASE } from 'app/constants/config'
import { Sidebar } from './Sidebar'
import { ChatArea } from './ChatArea'
import { NicknameGate } from './NicknameGate'
import { UpdateBanner } from './UpdateBanner'
import { Channel, ChannelType, CHANNELS } from './types'

export function HomeScreen() {
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [activeChannel, setActiveChannel] = useState<Channel>(CHANNELS[0])
  const [voiceParticipants, setVoiceParticipants] = useState<Record<string, string[]>>({})
  const [connectedVoiceChannelId, setConnectedVoiceChannelId] = useState<string | null>(null)
  const [channels, setChannels] = useState<Channel[]>(CHANNELS)
  const [showNicknameDialog, setShowNicknameDialog] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showCreateChannel, setShowCreateChannel] = useState(false)
  const [createChannelType, setCreateChannelType] = useState<ChannelType>('text')
  const [newChannelName, setNewChannelName] = useState('')
  const [nicknameInput, setNicknameInput] = useState('')
  const [appVersion, setAppVersion] = useState('')

  const handleParticipantsChange = useCallback((channelId: string, participants: string[]) => {
    setVoiceParticipants(prev => ({ ...prev, [channelId]: participants }))
  }, [])

  const handleChannelSelect = useCallback((channel: Channel) => {
    setActiveChannel(channel)
    // Only join a new voice channel — never auto-disconnect when switching to text
    if (channel.type === 'voice' && connectedVoiceChannelId !== channel.id) {
      setConnectedVoiceChannelId(channel.id)
    }
  }, [connectedVoiceChannelId])

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

  // Fetch channels from server on startup (falls back to hardcoded defaults on error)
  useEffect(() => {
    fetch(`${API_BASE}/channels`)
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setChannels(data) })
      .catch(() => {})
  }, [])

  // Listen for voice state and channel creation broadcasts
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

  // Get app version from Electron
  useEffect(() => {
    (window as any).electronAPI?.getVersion().then((v: string) => setAppVersion(v))
  }, [])

  const sidebarProps = {
    channels,
    activeChannel,
    voiceParticipants,
    connectedVoiceChannelId,
    onChannelSelect: handleChannelSelect,
    onParticipantsChange: handleParticipantsChange,
    onVoiceDisconnect: handleVoiceDisconnect,
    onCreateChannel: handleOpenCreateChannel,
  }

  return (
    <NicknameGate>
      {(nickname, changeNickname) => (
        <YStack height="100vh" bg="$background" position="relative">
          <UpdateBanner />
          {/* Thin drag region for Electron window dragging */}
          <XStack
            height={28}
            bg="$color1"
            borderBottomWidth={1}
            borderColor="$borderColor"
            alignItems="center"
            px="$3"
            // @ts-ignore — Electron-specific CSS property
            style={{ WebkitAppRegion: 'drag', userSelect: 'none' }}
          >
            {/* Interactive zone — must opt out of drag so clicks work */}
            <XStack gap="$1" alignItems="center" // @ts-ignore
              style={{ WebkitAppRegion: 'no-drag' }}>
              <Button
                size="$1"
                chromeless
                onPress={() => { setNicknameInput(nickname); setShowNicknameDialog(true) }}
              >
                <XStack gap="$1" alignItems="center">
                  <Text fontSize="$2" color="$color11" fontWeight="600">{nickname}</Text>
                  <Pencil size={10} color="$color10" />
                </XStack>
              </Button>
              <Button
                size="$1"
                chromeless
                icon={Settings}
                onPress={() => setShowSettings(true)}
              />
            </XStack>
          </XStack>
        <XStack flex={1} bg="$background">
          {/* THIN ICON RAIL */}
          <YStack width={60} bg="$color2" borderRightWidth={1} borderColor="$borderColor" $max-md={{ display: 'none' }}>
            <Button icon={Menu} chromeless size="$4" />
          </YStack>

          {/* DESKTOP SIDEBAR */}
          <YStack $max-lg={{ display: 'none' }}>
            <Sidebar width={250} nickname={nickname} {...sidebarProps} />
          </YStack>

          {/* MAIN CONTENT */}
          <YStack flex={1}>
            {/* MOBILE HEADER */}
            <XStack p="$4" $sm={{ display: 'none' }} borderBottomWidth={1} borderColor="$borderColor" width="100%" jc="center">
              <Button icon={Menu} onPress={() => setShowMobileMenu(true)} />
            </XStack>

            {activeChannel.type === 'text' ? (
              <ChatArea nickname={nickname} channelId={activeChannel.id} />
            ) : (
              <VoiceChannelView
                channelId={activeChannel.id}
                participants={voiceParticipants[activeChannel.id] ?? []}
              />
            )}
          </YStack>

          {/* MOBILE DRAWER */}
          <Sheet open={showMobileMenu} onOpenChange={setShowMobileMenu} modal dismissOnSnapToBottom>
            <Sheet.Frame p="$4">
              <Sidebar
                width="100%"
                nickname={nickname}
                {...sidebarProps}
                onChannelSelect={(ch) => {
                  handleChannelSelect(ch)
                  setShowMobileMenu(false)
                }}
              />
            </Sheet.Frame>
            <Sheet.Overlay />
          </Sheet>
        </XStack>

          {/* ── Nickname change dialog ── */}
          <Sheet open={showNicknameDialog} onOpenChange={setShowNicknameDialog} modal dismissOnSnapToBottom snapPoints={[35]}>
            <Sheet.Frame p="$5" gap="$4">
              <Text fontWeight="700" fontSize="$6">Change nickname</Text>
              <Input
                value={nicknameInput}
                onChangeText={setNicknameInput}
                placeholder="New nickname..."
                size="$4"
                autoFocus
                autoCapitalize="none"
                autoCorrect={false}
                onSubmitEditing={() => {
                  const t = nicknameInput.trim()
                  if (t) { changeNickname(t); setShowNicknameDialog(false) }
                }}
              />
              <Button
                theme="active"
                size="$4"
                disabled={!nicknameInput.trim()}
                onPress={() => {
                  const t = nicknameInput.trim()
                  if (t) { changeNickname(t); setShowNicknameDialog(false) }
                }}
              >
                Save
              </Button>
            </Sheet.Frame>
            <Sheet.Overlay />
          </Sheet>

          {/* ── Create channel dialog ── */}
          <Sheet open={showCreateChannel} onOpenChange={setShowCreateChannel} modal dismissOnSnapToBottom snapPoints={[35]}>
            <Sheet.Frame p="$5" gap="$4">
              <Text fontWeight="700" fontSize="$6">
                New {createChannelType === 'text' ? 'Text' : 'Voice'} Channel
              </Text>
              <Input
                value={newChannelName}
                onChangeText={setNewChannelName}
                placeholder="channel-name"
                size="$4"
                autoFocus
                autoCapitalize="none"
                autoCorrect={false}
                onSubmitEditing={handleCreateChannel}
              />
              <Button
                theme="active"
                size="$4"
                disabled={!newChannelName.trim()}
                onPress={handleCreateChannel}
              >
                Create Channel
              </Button>
            </Sheet.Frame>
            <Sheet.Overlay />
          </Sheet>

          {/* ── Settings dialog ── */}
          <Sheet open={showSettings} onOpenChange={setShowSettings} modal dismissOnSnapToBottom snapPoints={[30]}>
            <Sheet.Frame p="$5" gap="$4">
              <Text fontWeight="700" fontSize="$6">Settings</Text>
              <YStack gap="$3">
                <XStack jc="space-between" ai="center">
                  <Paragraph color="$color10">Version</Paragraph>
                  <Text fontWeight="600">{appVersion || '—'}</Text>
                </XStack>
                <XStack jc="space-between" ai="center">
                  <Paragraph color="$color10">Nickname</Paragraph>
                  <Text fontWeight="600">{nickname}</Text>
                </XStack>
              </YStack>
            </Sheet.Frame>
            <Sheet.Overlay />
          </Sheet>

        </YStack>
      )}
    </NicknameGate>
  )
}

function VoiceChannelView({ channelId, participants }: { channelId: string; participants: string[] }) {
  return (
    <YStack flex={1} alignItems="center" justifyContent="center" gap="$6" p="$6">
      <XStack gap="$2" alignItems="center">
        <Volume2 size={20} color="$color10" />
        <Text fontSize="$6" color="$color10" fontWeight="600">
          {channelId}
        </Text>
      </XStack>

      {participants.length === 0 ? (
        <Text color="$color10" fontSize="$3">
          No one is here yet — join from the sidebar
        </Text>
      ) : (
        <XStack gap="$4" flexWrap="wrap" justifyContent="center">
          {participants.map(identity => (
            <YStack key={identity} alignItems="center" gap="$2" width={80}>
              {/* Avatar */}
              <XStack
                width={64}
                height={64}
                borderRadius="$10"
                backgroundColor="$color5"
                alignItems="center"
                justifyContent="center"
                borderWidth={2}
                borderColor="$color6"
              >
                <Text fontSize="$7" color="$color" fontWeight="700">
                  {identity.charAt(0).toUpperCase()}
                </Text>
              </XStack>
              {/* Name */}
              <Text fontSize="$2" color="$color" numberOfLines={1} textAlign="center">
                {identity}
              </Text>
            </YStack>
          ))}
        </XStack>
      )}
    </YStack>
  )
}
