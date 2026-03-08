'use client'

import { YStack } from '@my/ui'
import { useState } from 'react'
import type { Channel, ChannelType } from './types'
import type { Server } from 'app/features/home/identity/types'
import { ServerBanner } from 'app/features/home/channel/ServerBanner'
import { ChannelList } from 'app/features/home/channel/ChannelList'
import { JoinRequestsSheet } from 'app/features/home/sheets/JoinRequestsSheet'

type Props = {
  width?: number | string
  activeServer: Server
  channels: Channel[]
  activeChannel: Channel
  nickname: string
  voiceParticipants: Record<string, string[]>
  connectedVoiceChannelId: string | null
  onChannelSelect: (channel: Channel) => void
  onJoinVoice: (channel: Channel) => void
  onParticipantsChange: (channelId: string, participants: string[]) => void
  onVoiceDisconnect: () => void
  onCreateChannel: (type: ChannelType) => void
}

export const Sidebar = ({
  width = 240,
  activeServer,
  channels,
  activeChannel,
  nickname,
  voiceParticipants,
  connectedVoiceChannelId,
  onChannelSelect,
  onJoinVoice,
  onParticipantsChange,
  onVoiceDisconnect,
  onCreateChannel,
}: Props) => {
  const [showJoinRequests, setShowJoinRequests] = useState(false)

  return (
    // @ts-ignore
    <YStack
      flex={1}
      width={width}
      bg="$backgroundHover"
      borderRightWidth={1}
      borderColor="$borderColor"
    >
      <ServerBanner
        serverName={activeServer.name}
        onViewJoinRequests={() => setShowJoinRequests(true)}
      />

      {/* Scrollable channel list */}
      <YStack flex={1} overflowY="auto" p="$2">
        <ChannelList
          channels={channels}
          activeChannelId={activeChannel.id}
          onSelect={onChannelSelect}
          onJoinVoice={onJoinVoice}
          voiceParticipants={voiceParticipants}
          onCreateChannel={onCreateChannel}
        />
      </YStack>

      <JoinRequestsSheet
        open={showJoinRequests}
        onClose={() => setShowJoinRequests(false)}
        serverUrl={activeServer.url}
        serverName={activeServer.name}
      />
    </YStack>
  )
}
