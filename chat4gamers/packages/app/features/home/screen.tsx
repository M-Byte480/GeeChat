'use client'

import { XStack, YStack, Sheet, Button, Text, Input, Paragraph } from '@my/ui'
import { Menu, Settings, Pencil } from '@tamagui/lucide-icons'
import { useState, useEffect } from 'react'
import { Sidebar } from './Sidebar'
import { ChatArea } from './ChatArea'
import { IdentityGate } from './identity'
import type { Identity } from './identity'
import { UpdateBanner } from './UpdateBanner'
import { VoiceChannelView } from './components/VoiceChannelView'
import { useChannels } from './hooks/useChannels'

export function HomeScreen() {
  const {
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
    handleVoiceDisconnect,
    handleOpenCreateChannel,
    handleCreateChannel,
  } = useChannels()

  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showEditUsername, setShowEditUsername] = useState(false)
  const [usernameInput, setUsernameInput] = useState('')
  const [appVersion, setAppVersion] = useState('')

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
    <IdentityGate>
      {(identity: Identity, changeUsername) => (
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
            <XStack gap="$2" alignItems="center" // @ts-ignore
              style={{ WebkitAppRegion: 'no-drag' }}>
              <Button
                size="$1"
                chromeless
                onPress={() => { setUsernameInput(identity.username); setShowEditUsername(true) }}
              >
                <XStack gap="$2" alignItems="center">
                  {identity.pfp && (
                    // @ts-ignore — native img in web/Electron
                    <img src={identity.pfp} style={{ width: 20, height: 20, borderRadius: '50%', objectFit: 'cover' }} />
                  )}
                  <Text fontSize="$2" color="$color11" fontWeight="600">{identity.username}</Text>
                  <Pencil size={10} color="$color10" />
                </XStack>
              </Button>
              <Button size="$1" chromeless icon={Settings} onPress={() => setShowSettings(true)} />
            </XStack>
          </XStack>

          <XStack flex={1} bg="$background">
            {/* Thin icon rail */}
            <YStack width={60} bg="$color2" borderRightWidth={1} borderColor="$borderColor" $max-md={{ display: 'none' }}>
              <Button icon={Menu} chromeless size="$4" />
            </YStack>

            {/* Desktop sidebar */}
            <YStack $max-lg={{ display: 'none' }}>
              <Sidebar width={250} nickname={identity.username} {...sidebarProps} />
            </YStack>

            {/* Main content */}
            <YStack flex={1}>
              <XStack p="$4" $sm={{ display: 'none' }} borderBottomWidth={1} borderColor="$borderColor" width="100%" jc="center">
                <Button icon={Menu} onPress={() => setShowMobileMenu(true)} />
              </XStack>

              {activeChannel.type === 'text' ? (
                <ChatArea identity={identity} channelId={activeChannel.id} />
              ) : (
                <VoiceChannelView
                  channelId={activeChannel.id}
                  participants={voiceParticipants[activeChannel.id] ?? []}
                />
              )}
            </YStack>

            {/* Mobile drawer */}
            <Sheet open={showMobileMenu} onOpenChange={setShowMobileMenu} modal dismissOnSnapToBottom>
              <Sheet.Frame p="$4">
                <Sidebar
                  width="100%"
                  nickname={identity.username}
                  {...sidebarProps}
                  onChannelSelect={(ch) => { handleChannelSelect(ch); setShowMobileMenu(false) }}
                />
              </Sheet.Frame>
              <Sheet.Overlay />
            </Sheet>
          </XStack>

          {/* ── Edit username ── */}
          <Sheet open={showEditUsername} onOpenChange={setShowEditUsername} modal dismissOnSnapToBottom snapPoints={[35]}>
            <Sheet.Frame p="$5" gap="$4">
              <Text fontWeight="700" fontSize="$6">Change username</Text>
              <Input
                value={usernameInput}
                onChangeText={setUsernameInput}
                placeholder="New username..."
                size="$4"
                autoFocus
                autoCapitalize="none"
                autoCorrect={false}
                onSubmitEditing={() => {
                  const t = usernameInput.trim()
                  if (t) { changeUsername(t); setShowEditUsername(false) }
                }}
              />
              <Button
                theme="active"
                size="$4"
                disabled={!usernameInput.trim()}
                onPress={() => {
                  const t = usernameInput.trim()
                  if (t) { changeUsername(t); setShowEditUsername(false) }
                }}
              >
                Save
              </Button>
            </Sheet.Frame>
            <Sheet.Overlay />
          </Sheet>

          {/* ── Create channel ── */}
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
              <Button theme="active" size="$4" disabled={!newChannelName.trim()} onPress={handleCreateChannel}>
                Create Channel
              </Button>
            </Sheet.Frame>
            <Sheet.Overlay />
          </Sheet>

          {/* ── Settings ── */}
          <Sheet open={showSettings} onOpenChange={setShowSettings} modal dismissOnSnapToBottom snapPoints={[35]}>
            <Sheet.Frame p="$5" gap="$4">
              <Text fontWeight="700" fontSize="$6">Settings</Text>
              <YStack gap="$3">
                <XStack jc="space-between" ai="center">
                  <Paragraph color="$color10">Version</Paragraph>
                  <Text fontWeight="600">{appVersion || '—'}</Text>
                </XStack>
                <XStack jc="space-between" ai="center">
                  <Paragraph color="$color10">Username</Paragraph>
                  <Text fontWeight="600">{identity.username}</Text>
                </XStack>
                <XStack jc="space-between" ai="center">
                  <Paragraph color="$color10">Public Key</Paragraph>
                  <Text fontWeight="600" fontSize="$2" color="$color10">
                    {identity.publicKey.slice(0, 16)}…
                  </Text>
                </XStack>
              </YStack>
            </Sheet.Frame>
            <Sheet.Overlay />
          </Sheet>

        </YStack>
      )}
    </IdentityGate>
  )
}
