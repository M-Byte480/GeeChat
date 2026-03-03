'use client'

import { XStack, YStack, Sheet, Button, Text } from '@my/ui'
import { Menu, Settings, Pencil } from '@tamagui/lucide-icons'
import { useState, useEffect } from 'react'
import { Sidebar } from './Sidebar'
import { ChatArea } from './ChatArea'
import { IdentityGate } from './identity'
import type { Identity } from './identity'
import { UpdateBanner } from './UpdateBanner'
import { VoiceChannelView } from './components/VoiceChannelView'
import { useChannels } from './hooks/useChannels'
import { ServerPane } from 'app/features/home/server-pane/ServerPane'
import { ChannelBanner } from 'app/features/home/channel/ChannelBanner'
import { MemberPane } from 'app/features/home/user/MemberPane'
import { ThisUserProperties } from 'app/features/home/user/ThisUserProperties'
import { SettingsSheet } from 'app/features/home/sheets/SettingsSheet'
import { CreateChannelSheet } from 'app/features/home/sheets/CreateChannelSheet'
import { EditUsernameSheet } from 'app/features/home/sheets/EditUsernameSheet'
import { UserStatus } from 'app/features/home/types/User'
import type { User } from 'app/features/home/types/User'

const MOCK_MEMBERS: User[] = [
  { username: 'Milan',       publicKey: 'pk1', status: UserStatus.ONLINE },
  { username: 'Gamer123',    publicKey: 'pk2', status: UserStatus.ONLINE },
  { username: 'ProSniper',   publicKey: 'pk3', status: UserStatus.AWAY },
  { username: 'NightOwl',    publicKey: 'pk4', status: UserStatus.DO_NOT_DISTURB },
  { username: 'PixelHunter', publicKey: 'pk5', status: UserStatus.OFFLINE },
  { username: 'StarCraft',   publicKey: 'pk6', status: UserStatus.ONLINE },
]

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
    handleVoiceJoin,
    handleVoiceDisconnect,
    handleOpenCreateChannel,
    handleCreateChannel,
  } = useChannels()

  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showEditUsername, setShowEditUsername] = useState(false)
  const [showMemberPane, setShowMemberPane] = useState(true)
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
    onJoinVoice: handleVoiceJoin,
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
            <ServerPane />
            <XStack position="absolute" bottom={0} left={0}>
              <ThisUserProperties
                connectedVoiceChannelId={connectedVoiceChannelId}
                nickname={identity.username}
                user={{ username: identity.username, publicKey: identity.publicKey, status: UserStatus.ONLINE, avatarUrl: identity.pfp }}
                onParticipantsChange={handleParticipantsChange}
                onVoiceDisconnect={handleVoiceDisconnect}
              />
            </XStack>
            {/* Desktop sidebar */}
            <YStack $max-lg={{ display: 'none' }}>
              <Sidebar width={250} nickname={identity.username} {...sidebarProps} />
            </YStack>

            {/* Main content */}
            <YStack flex={1}>
              <ChannelBanner
                showMemberPane={showMemberPane}
                onToggleMemberPane={() => setShowMemberPane(p => !p)}
              />

              <XStack p="$4" $sm={{ display: 'none' }} borderBottomWidth={1} borderColor="$borderColor" width="100%" jc="center">
                <Button icon={Menu} onPress={() => setShowMobileMenu(true)} />
              </XStack>

              <XStack flex={1} bg="$background" gap="$2">
                {activeChannel.type === 'text' ? (
                  <ChatArea identity={identity} channelId={activeChannel.id} />
                ) : (
                  <VoiceChannelView
                    channelId={activeChannel.id}
                    participants={voiceParticipants[activeChannel.id] ?? []}
                  />
                )}
                {showMemberPane && <MemberPane members={MOCK_MEMBERS} />}
              </XStack>

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
          <EditUsernameSheet
            showEditUsername={showEditUsername}
            setShowEditUsername={setShowEditUsername}
            usernameInput={usernameInput}
            setUsernameInput={setUsernameInput}
            changeUsername={changeUsername}
          />

          <CreateChannelSheet
            showCreateChannel={showCreateChannel}
            setShowCreateChannel={setShowCreateChannel}
            createChannelType={createChannelType}
            newChannelName={newChannelName}
            setNewChannelName={setNewChannelName}
            handleCreateChannel={handleCreateChannel}
          />

        <SettingsSheet
          showSettings={showSettings}
          setShowSettings={setShowSettings}
          identity={identity}
          appVersion={appVersion}
        />

        </YStack>
      )}
    </IdentityGate>
  )
}
