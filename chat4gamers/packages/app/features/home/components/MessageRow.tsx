import { useUser } from '../hooks/useUser'
import { Avatar, Text, XStack, YStack } from '@my/ui'
import { Message } from 'app/features/home/types/types'
import { MentionText } from 'app/features/home/text/MentionText'
import { memo, useMemo } from 'react'
import type { Identity } from 'app/features/home/identity/types'

interface Props {
  message: Message
  serverUrl: string
  identity: Identity
  /** When false (grouped message), skip avatar/username/useUser — much cheaper */
  showHeader: boolean
  /** True only for the very first message in the rendered list — suppresses top margin */
  isFirst: boolean
  onLayout?: (event: unknown) => void
}

const AVATAR_INDENT = 58

export const MessageRow = memo(
  ({ message, serverUrl, identity, showHeader, isFirst, onLayout }: Props) => {
    const user = useUser(
      showHeader ? serverUrl : null,
      message.senderId,
      showHeader ? identity : null
    )
    const timeString = useMemo(
      () =>
        new Date(message.timestamp).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
      [message.timestamp]
    )

    if (!showHeader) {
      return (
        <XStack
          paddingLeft={AVATAR_INDENT}
          alignItems="flex-start"
          onLayout={onLayout}
        >
          <XStack flex={1}>
            <MentionText
              content={message.content}
              serverUrl={serverUrl}
              identity={identity}
            />
          </XStack>
        </XStack>
      )
    }

    return (
      <XStack
        gap="$3"
        marginTop={isFirst ? '$1' : '$4'}
        alignItems="flex-start"
        onLayout={onLayout}
      >
        <Avatar circular size="$4" userSelect="none" alignSelf="flex-start">
          <Avatar.Image
            src={user?.avatarUrl || 'https://placehold.co/100x100'}
            draggable={false}
          />
          <Avatar.Fallback bc="$color8" />
        </Avatar>
        <YStack flex={1} minWidth={0} alignSelf="flex-start">
          <XStack gap="$2" alignItems="center">
            <Text fontWeight="bold" fontSize="$3" userSelect="text">
              {user?.nickname ?? user?.username ?? message.senderName}
            </Text>
            <Text fontSize="$1" color="$gray10" userSelect="none">
              {timeString}
            </Text>
          </XStack>
          <MentionText
            content={message.content}
            serverUrl={serverUrl}
            identity={identity}
          />
        </YStack>
      </XStack>
    )
  }
)
