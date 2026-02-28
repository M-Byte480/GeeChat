'use client'

import { YStack } from '@my/ui'
import { VoiceRoom } from './VoiceRoom'
import { ChannelList } from './ChannelList'
import type { Channel, ChannelType } from './types'

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

    {/* Voice controls — persist as long as connected, regardless of active channel */}
    {connectedVoiceChannelId && (
      <VoiceRoom
        channelId={connectedVoiceChannelId}
        nickname={nickname}
        onParticipantsChange={onParticipantsChange}
        onDisconnect={onVoiceDisconnect}
      />
    )}
  </YStack>
)
