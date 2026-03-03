'use client'

import { YStack } from '@my/ui'
import type { Channel, ChannelType } from './types'
import {ServerBanner} from "app/features/home/channel/ServerBanner";
import {ChannelList} from "app/features/home/channel/ChannelList";

type Props = {
  width?: number | string
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
}: Props) => (
  // @ts-ignore
  <YStack
    flex={1}
    width={width}
    bg="$backgroundHover"
    borderRightWidth={1}
    borderColor="$borderColor"
  >
    {/* Fixed Header */}
    <ServerBanner />

    {/* Scrollable Area */}
    <YStack
      flex={1}
      overflowY="auto" // Allows the list to scroll
      p="$2"
    >
      <ChannelList
        channels={channels}
        activeChannelId={activeChannel.id}
        onSelect={onChannelSelect}
        onJoinVoice={onJoinVoice}
        voiceParticipants={voiceParticipants}
        onCreateChannel={onCreateChannel}
      />
    </YStack>
  </YStack>
)
