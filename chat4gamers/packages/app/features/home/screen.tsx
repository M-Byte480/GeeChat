'use client'

import { XStack, YStack, Sheet, Button } from '@my/ui'
import { Menu } from '@tamagui/lucide-icons'
import {useState, useEffect, useCallback, memo, Profiler} from 'react'
import { Sidebar } from './Sidebar'
import { ChatArea } from './chat/ChatArea'
import { IdentityGate } from './identity'
import type { Identity } from './identity'
import { VoiceChannelView } from './components/VoiceChannelView'
import { useChannels } from './hooks/useChannels'
import { useServerMembers } from './hooks/useServerMembers'
import { ServerPane } from 'app/features/home/server-pane/ServerPane'
import { ChannelBanner } from 'app/features/home/channel/ChannelBanner'
import { DirectMessagesBanner } from 'app/features/home/chat/DirectMessagesBanner'
import { DirectMessagesComponent } from 'app/features/home/chat/DirectMessagesComponent'
import { DirectMessagePage } from 'app/features/home/chat/DirectMessagePage'
import { MemberPane } from 'app/features/home/user/MemberPane'
import { TopScreenStatusBar } from 'app/features/home/TopScreenStatusBar'
import { NotificationBanner } from 'app/features/home/NotificationBanner'
import { useAppStore } from 'app/features/home/hooks/useAppStore'
import { UserPromptDialog } from 'app/features/home/components/UserPromptDialog'
import { OverlayManager } from 'app/features/home/managers/OverlayManager'
import { useChannelsController } from 'app/features/home/hooks/useChannelsController'
import {Channel, ChannelType} from 'app/features/home/types/types'
import {useIdentity} from "app/features/home/identity/IdentityContext";
import {useWhyDidYouRender} from "app/features/home/hooks/useWhyDidYouRender";

const EMPTY_CHANNELS: Channel[] = []
const EMPTY_VOICE_PARTICIPANTS: Record<string, string[]> = {}

export function HomeScreen() {

  return (
    <IdentityGate>
      <HomeScreenInner />
    </IdentityGate>
  )
}

export function onRender(id, phase, actualDuration, baseDuration, startTime, commitTime) {
  console.log(`[Profiler] ${id} rendered. Phase: ${phase}. Actual duration: ${actualDuration}ms`)
}

const HomeScreenInner = memo(function HomeScreenInner() {
  const {identity, changeUsername, changePfp, servers, addServer, deleteServer} = useIdentity()

  const activeServerUrl = useAppStore((s) => s.activeServerUrl)
  const setActiveServerUrl = useAppStore((s) => s.setActiveServerUrl)
  const channels = useAppStore((s) => s.cache[activeServerUrl ?? '']?.channels ?? EMPTY_CHANNELS)
  const voiceParticipants = useAppStore((s) => s.cache[activeServerUrl ?? '']?.voiceParticipants ?? EMPTY_VOICE_PARTICIPANTS)

  const {
    activeChannel,
    connectedVoiceChannelId,
    handleChannelSelect,
    handleVoiceJoin,
    handleVoiceDisconnect,
    handleParticipantsChange,
  } = useChannels(activeServerUrl)

  const [usernameInput, setUsernameInput] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const [showEditUsername, setShowEditUsername] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [showMemberPane, setShowMemberPane] = useState(true)
  const [showCreateChannel, setShowCreateChannel] = useState(false)
  const [createChannelType, setCreateChannelType] = useState<ChannelType>('text')
  const [newChannelName, setNewChannelName] = useState('')
  const [appVersion, setAppVersion] = useState('')

  useChannelsController(activeServerUrl)

  const serverMembers = useServerMembers(activeServerUrl)

  const handleOpenCreateChannel = useCallback((type: ChannelType) => {
    setCreateChannelType(type)
    setNewChannelName('')
    setShowCreateChannel(true)
  }, [])


  useEffect(() => {
    (window as any).electronAPI?.getVersion().then((v: string) => setAppVersion(v))
  }, [])

  const activeServer = servers.find(s => s.url === activeServerUrl) ?? null

  const sidebarProps = {
    channels,
    activeChannel,
    voiceParticipants,
    onChannelSelect: handleChannelSelect,
    onJoinVoice: handleVoiceJoin,
    onCreateChannel: handleOpenCreateChannel,
  }

  useWhyDidYouRender('HomeScreenInner', {
    identity,
    activeServerUrl,
    channels,
    activeChannel,
    voiceParticipants,
    serverMembers,
  })

  return (
    <YStack height="100vh" bg="$background" position="relative">

      <TopScreenStatusBar
        setUsernameInput={setUsernameInput}
        setShowEditUsername={setShowEditUsername}
        setShowSettings={setShowSettings}
        identity={identity}
      />

      <NotificationBanner/>

      <XStack flex={1} bg="$background">
        <ServerPane
          servers={servers}
          activeServerId={activeServer?.id ?? null}
          onSelectServer={(server) => setActiveServerUrl(server.url)}
          onAddServer={addServer}
          isDMsActive={!activeServer}
          onSelectDMs={() => {
            setActiveServerUrl(null)
            if (channels.length > 0) handleChannelSelect(channels[0])
          }}
          identity={{publicKey: identity.publicKey, username: identity.username, pfp: identity.pfp}}
          serverContextOptions={(server) => [
            {
              label: 'Mark as Read', onPress: () => {
              }
            },
            {label: 'Copy URL', onPress: () => navigator.clipboard.writeText(server.url)},
            {
              label: 'Leave Server',
              onPress: async () => {
                try {
                  deleteServer(server.url)

                  const res = await fetch(`${server.url}/leave`, {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({publicKey: identity.publicKey}),
                  })
                  const data = await res.json()
                  if (!res.ok) {
                    console.error(data.error ?? 'Failed to leave server')
                    return
                  }
                  deleteServer(server.url)
                  if (activeServer?.url === server.url) {
                    setActiveServerUrl(null)
                  }
                } catch (e) {
                  console.error('Failed to leave server', e)
                }
              },
              destructive: true,
            },
          ]}
        />

        <UserPromptDialog
          connectedVoiceChannelId={connectedVoiceChannelId}
          passedIdentity={identity}
          activeServer={activeServer}
          handleParticipantsChange={handleParticipantsChange}
          handleVoiceDisconnect={handleVoiceDisconnect}
        />

        {/* Desktop sidebar */}
        <YStack>
          {activeServer ? (
            // {
            //   visitedServer.map(id => (
            <Sidebar width={250} activeServer={activeServer} {...sidebarProps} />
            //   ))
            // }
          ) : (
            <DirectMessagesComponent/>
          )}
        </YStack>

        {/* Main content */}
        <YStack flex={1}>
          {activeServer ? (
            <ChannelBanner
              showMemberPane={showMemberPane}
              onToggleMemberPane={() => setShowMemberPane(p => !p)}
            />
          ) : (
            <DirectMessagesBanner
              showMemberPane={showMemberPane}
              onToggleMemberPane={() => setShowMemberPane(p => !p)}
            />
          )}

          <XStack p="$4" $sm={{display: 'none'}} borderBottomWidth={1} borderColor="$borderColor" width="100%"
                  jc="center">
            <Button icon={Menu} onPress={() => setShowMobileMenu(true)}/>
          </XStack>

          <XStack flex={1} bg="$background" gap="$2">
            {!activeServer ? (
              <DirectMessagePage/>
            ) : activeChannel.type === 'text' ? (
              <Profiler id="ChatArea" onRender={onRender}>
                <ChatArea channelId={activeChannel.id} serverUrl={activeServer.url} members={serverMembers}/>
              </Profiler>
            ) : (
              <Profiler id="VoiceChannelView" onRender={onRender}>
                <VoiceChannelView
                  channelId={activeChannel.id}
                  participants={voiceParticipants[activeChannel.id] ?? []}
                />
              </Profiler>
            )}
            {activeServer && showMemberPane && <MemberPane
                members={serverMembers}
                serverUrl={activeServer.url}
                identity={identity}
            />}
          </XStack>
        </YStack>

        {/* Mobile drawer */}
        {/*<Sheet open={showMobileMenu} onOpenChange={setShowMobileMenu} modal dismissOnSnapToBottom>*/}
        {/*  <Sheet.Frame p="$4">*/}
        {/*    {activeServer && (*/}
        {/*      <Sidebar*/}
        {/*        width="100%"*/}
        {/*        nickname={identity.username}*/}
        {/*        activeServer={activeServer}*/}
        {/*        {...sidebarProps}*/}
        {/*        onChannelSelect={(ch) => {*/}
        {/*          handleChannelSelect(ch);*/}
        {/*          setShowMobileMenu(false)*/}
        {/*        }}*/}
        {/*      />*/}
        {/*    )}*/}
        {/*  </Sheet.Frame>*/}
        {/*  <Sheet.Overlay/>*/}
        {/*</Sheet>*/}

      </XStack>

      <Profiler id="OverlayManager" onRender={onRender}>

      <OverlayManager
        serverUrl={activeServerUrl}
        changeUsername={changeUsername}
        identity={identity}
        showEditUsername={showEditUsername}
        setShowEditUsername={setShowEditUsername}
        usernameInput={usernameInput}
        setUsernameInput={setUsernameInput}
        showSettings={showSettings}
        setShowSettings={setShowSettings}
        showCreateChannel={showCreateChannel}
        setShowCreateChannel={setShowCreateChannel}
        createChannelType={createChannelType}
        newChannelName={newChannelName}
        setNewChannelName={setNewChannelName}
        appVersion={appVersion}
        changePfp={changePfp}
      />
      </Profiler>

    </YStack>
  )
})

