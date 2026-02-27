'use client'

import { XStack, YStack, Sheet, Button, Text } from '@my/ui'
import { Menu, Volume2 } from '@tamagui/lucide-icons'
import { useState, useCallback } from 'react'
import { Sidebar } from './Sidebar'
import { ChatArea } from './ChatArea'
import { NicknameGate } from './NicknameGate'
import { Channel, CHANNELS } from './types'

export function HomeScreen() {
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [activeChannel, setActiveChannel] = useState<Channel>(CHANNELS[0])
  const [voiceParticipants, setVoiceParticipants] = useState<Record<string, string[]>>({})
  const [connectedVoiceChannelId, setConnectedVoiceChannelId] = useState<string | null>(null)

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

  const sidebarProps = {
    channels: CHANNELS,
    activeChannel,
    voiceParticipants,
    connectedVoiceChannelId,
    onChannelSelect: handleChannelSelect,
    onParticipantsChange: handleParticipantsChange,
    onVoiceDisconnect: handleVoiceDisconnect,
  }

  return (
    <NicknameGate>
      {(nickname) => (
        <YStack height="100vh" bg="$background">
          {/* Thin drag region for Electron window dragging */}
          <XStack
            height={28}
            bg="$color1"
            borderBottomWidth={1}
            borderColor="$borderColor"
            // @ts-ignore — Electron-specific CSS property
            style={{ WebkitAppRegion: 'drag', userSelect: 'none' }}
          />
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
