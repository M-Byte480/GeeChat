'use client'

import { YStack, XStack, Text, Button, Icon } from '@my/ui'
import {Hash, Volume2, Plus, Menu, ChevronLeft, ChevronDown} from '@tamagui/lucide-icons'
import {useEffect, useRef, useState} from 'react'
import type { Channel, ChannelType } from './types'
import {ContextMenu} from "app/features/home/components/ContextMenu";
import {ChevronRight, ChevronUp} from "lucide-react";

type Props = {
  channels: Channel[]
  activeChannelId: string
  onSelect: (channel: Channel) => void
  onJoinVoice: (channel: Channel) => void
  voiceParticipants: Record<string, string[]>
  onCreateChannel: (type: ChannelType) => void
}

export function ChannelList({ channels, activeChannelId, onSelect, onJoinVoice, voiceParticipants, onCreateChannel }: Props) {
  const [textExpanded, setTextExpanded] = useState(true)
  const [voiceExpanded, setVoiceExpanded] = useState(true)

  const textChannels = channels.filter(c => c.type === 'text')
  const voiceChannels = channels.filter(c => c.type === 'voice')

  return (
    <YStack flex={1} gap="$1">
      <SectionLabel
        label="Text Channels"
        expanded={textExpanded}
        onToggle={() => setTextExpanded(p => !p)}
        onAdd={() => onCreateChannel('text')} />
      {textExpanded && textChannels.map(ch => (
        <ChannelRow
          key={ch.id}
          channel={ch}
          isActive={ch.id === activeChannelId}
          onSelect={onSelect}
        />
      ))}

      <SectionLabel
        label="Voice Channels"
        expanded={voiceExpanded}
        onToggle={() => setVoiceExpanded(p => !p)}
        onAdd={() => onCreateChannel('voice')}
        mt="$3"
      />
      {voiceExpanded && voiceChannels.map(ch => (
        <YStack key={ch.id}>
          <ChannelRow
            channel={ch}
            isActive={ch.id === activeChannelId}
            onSelect={onSelect}
            onJoinVoice={onJoinVoice}
          />
          {(voiceParticipants[ch.id] ?? []).map(identity => (
            <ParticipantRow key={identity} identity={identity} />
          ))}
        </YStack>
      ))}
    </YStack>
  )
}

function SectionLabel({ label, expanded, onToggle, onAdd, mt }: {
  label: string
  expanded: boolean
  onToggle: () => void
  onAdd: () => void
  mt?: string
}) {
  return (
    <XStack alignItems="center" px="$2" pb="$1" mt={mt as any} cursor="pointer" >
      <XStack alignItems="center">
        <Button
          size="$1"
          chromeless
          icon={expanded ? ChevronDown : ChevronRight}
          onPress ={onToggle}
        />

        <Text
          flex={1}
          fontSize={12}
          color="$color10"
          fontWeight="700"
          letterSpacing={1}
          textTransform="uppercase"
          onPress ={onToggle}
        >
          {label}
        </Text>

      <Button
        size="$1"
        chromeless
        icon={Plus}
        onPress={onAdd}
        color="$color10"
        hoverStyle={{  }}
      />
      </XStack>
    </XStack>
  )
}

const DOUBLE_CLICK_MS = 350

function ChannelRow({ channel, isActive, onSelect, onJoinVoice }: {
  channel: Channel
  isActive: boolean
  onSelect: (ch: Channel) => void
  onJoinVoice?: (ch: Channel) => void
}) {
  const lastPressRef = useRef(0)
  const Icon = channel.type === 'text' ? Hash : Volume2
  const options = [
    {
      label: 'Edit Channel',
      onPress: () => alert('Edit channel ' + channel.name)
    },
    {
      label: 'Delete Channel',
      onPress: () => alert('Delete channel ' + channel.name),
      destructive: true
    }
  ]

  const handlePress = () => {
    if (channel.type === 'voice' && onJoinVoice) {
      const now = Date.now()
      if (now - lastPressRef.current < DOUBLE_CLICK_MS) {
        onJoinVoice(channel)
        lastPressRef.current = 0
      } else {
        onSelect(channel)
        lastPressRef.current = now
      }
    } else {
      onSelect(channel)
    }
  }
 //         hoverStyle={{ backgroundColor: isActive ? '$color4' : '$color3' }}
  return (
    <ContextMenu options={options}>
      <XStack
        px="$2"
        py="$2"
        borderRadius="$3"
        gap="$1"
        alignItems="center"
        cursor="pointer"
        onPress={handlePress}
        backgroundColor={isActive ? '$color4' : 'transparent'}
        hoverStyle={{backgroundColor: '$color4'}}
        animation="quick"
        pressStyle={{ scale: 0.98 }}
      >
        <Icon size={14} color={isActive ? '$color' : '$color10'} />
        <Text
          fontSize="$4"
          color={isActive ? '$color' : '$color11'}
          fontWeight={isActive ? '500' : '400'}
        >
          {channel.name}
        </Text>
      </XStack>
    </ContextMenu>
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
