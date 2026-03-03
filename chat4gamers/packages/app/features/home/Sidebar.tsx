'use client'

import { YStack } from '@my/ui'
import { ChannelList } from './ChannelList'
import type { Channel, ChannelType } from './types'
import {ThisUserProperties} from "app/features/home/user/ThisUserProperties";

type Props = {
  width?: number | string
  channels: Channel[]
  activeChannel: Channel
  nickname: string
  voiceParticipants: Record<string, string[]>
  connectedVoiceChannelId: string | null
  onChannelSelect: (channel: Channel) => void
  onParticipantsChange: (channelId: string, participants: string[]) => void
  onVoiceDisconnect: () => void
  onCreateChannel: (type: ChannelType) => void
}

export const Sidebar = ({
  width = 200,
  channels,
  activeChannel,
  nickname,
  voiceParticipants,
  connectedVoiceChannelId,
  onChannelSelect,
  onParticipantsChange,
  onVoiceDisconnect,
  onCreateChannel,
}: Props) => (
  // @ts-ignore
  <YStack flex={1} width={width} bg="$backgroundHover" borderRightWidth={1} borderColor="$borderColor" overflow="hidden">
    {/* Scrollable channel list */}
    <YStack flex={1} p="$3" overflow="hidden">
      <ChannelList
        channels={channels}
        activeChannelId={activeChannel.id}
        onSelect={onChannelSelect}
        voiceParticipants={voiceParticipants}
        onCreateChannel={onCreateChannel}
      />
    </YStack>

    <ThisUserProperties connectedVoiceChannelId={connectedVoiceChannelId}
                        nickname={nickname}
                        onParticipantsChange={onParticipantsChange}
                        onVoiceDisconnect={onVoiceDisconnect}
     />

  </YStack>
)
