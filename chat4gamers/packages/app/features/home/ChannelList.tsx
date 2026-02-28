'use client'

import { YStack, XStack, Text, Button } from '@my/ui'
import { Hash, Volume2, Plus } from '@tamagui/lucide-icons'
import type { Channel, ChannelType } from './types'

type Props = {
  channels: Channel[]
  activeChannelId: string
  onSelect: (channel: Channel) => void
  voiceParticipants: Record<string, string[]>
  onCreateChannel: (type: ChannelType) => void
}

export function ChannelList({ channels, activeChannelId, onSelect, voiceParticipants, onCreateChannel }: Props) {
  const textChannels = channels.filter(c => c.type === 'text')
  const voiceChannels = channels.filter(c => c.type === 'voice')

  return (
    <YStack flex={1} gap="$1">
      <SectionLabel label="Text Channels" onAdd={() => onCreateChannel('text')} />
      {textChannels.map(ch => (
        <ChannelRow
          key={ch.id}
          channel={ch}
          isActive={ch.id === activeChannelId}
          onSelect={onSelect}
        />
      ))}

      <SectionLabel label="Voice Channels" onAdd={() => onCreateChannel('voice')} mt="$3" />
      {voiceChannels.map(ch => (
        <YStack key={ch.id}>
          <ChannelRow
            channel={ch}
            isActive={ch.id === activeChannelId}
            onSelect={onSelect}
          />
          {(voiceParticipants[ch.id] ?? []).map(identity => (
            <ParticipantRow key={identity} identity={identity} />
          ))}
        </YStack>
      ))}
    </YStack>
  )
}

function SectionLabel({ label, onAdd, mt }: { label: string; onAdd: () => void; mt?: string }) {
  return (
    <XStack alignItems="center" px="$2" pb="$1" mt={mt as any}>
      <Text
        flex={1}
        fontSize={10}
        color="$color10"
        fontWeight="700"
        letterSpacing={1}
        textTransform="uppercase"
      >
        {label}
      </Text>
      <Button
        size="$1"
        chromeless
        icon={Plus}
        onPress={onAdd}
        color="$color10"
        hoverStyle={{ color: '$color' }}
      />
    </XStack>
  )
}

function ChannelRow({ channel, isActive, onSelect }: {
  channel: Channel
  isActive: boolean
  onSelect: (ch: Channel) => void
}) {
  const Icon = channel.type === 'text' ? Hash : Volume2

  return (
    <XStack
      px="$2"
      py="$1"
      borderRadius="$3"
      gap="$2"
      alignItems="center"
      cursor="pointer"
      onPress={() => onSelect(channel)}
      backgroundColor={isActive ? '$color4' : 'transparent'}
      hoverStyle={{ backgroundColor: isActive ? '$color4' : '$color3' }}
      animation="quick"
      pressStyle={{ scale: 0.98 }}
    >
      <Icon size={14} color={isActive ? '$color' : '$color10'} />
      <Text
        fontSize="$3"
        color={isActive ? '$color' : '$color11'}
        fontWeight={isActive ? '600' : '400'}
        userSelect="none"
      >
        {channel.name}
      </Text>
    </XStack>
  )
}

function ParticipantRow({ identity }: { identity: string }) {
  return (
    <XStack pl="$7" py="$1" gap="$2" alignItems="center">
      <XStack
        width={20}
        height={20}
        borderRadius="$10"
        backgroundColor="$color5"
        alignItems="center"
        justifyContent="center"
        flexShrink={0}
      >
        <Text fontSize={9} color="$color" fontWeight="700">
          {identity.charAt(0).toUpperCase()}
        </Text>
      </XStack>
      <Text fontSize="$2" color="$color11" numberOfLines={1}>
        {identity}
      </Text>
    </XStack>
  )
}
