// packages/app/features/home/chat/MentionText.tsx
import { Text, XStack } from '@my/ui'
import { useUser } from '../hooks/useUser'
import type { Identity } from '../identity'

interface Props {
  content: string
  serverUrl: string
  identity: Identity
}

// Splits message content into plain text and mention tokens
function parseContent(content: string): Array<{ type: 'text' | 'mention'; value: string }> {
  const parts = content.split(/(@[A-Za-z0-9_-]{32,})/g)
  return parts.map(part => ({
    type: part.match(/^@[A-Za-z0-9_-]{32,}$/) ? 'mention' : 'text',
    value: part,
  }))
}

function MentionChip({ publicKey, serverUrl, identity, isOwn }: {
  publicKey: string
  serverUrl: string
  identity: Identity
  isOwn: boolean
}) {
  const user = useUser(serverUrl, publicKey, identity)
  return (
    <Text
      bg={'$blue5'}
      color={'$blue11'}
      borderRadius="$2"
      px="$1"
      fontWeight="600"
      fontSize="$3"
    >
      @{user?.nickname ?? user?.username ?? publicKey.slice(0, 8)}
    </Text>
  )
}



export function MentionText({ content, serverUrl, identity }: Props) {
  const parts = parseContent(content)
  const isMentioned = parts.some(
    p => p.type === 'mention' && p.value.slice(1) === identity.publicKey
  )

  return (
    <XStack
      flexWrap="wrap"
      alignItems="center"
      gap="$1"
      bg={isMentioned ? '$yellow2' : undefined}
      borderRadius="$2"
      px={isMentioned ? '$2' : undefined}
      py={isMentioned ? '$1' : undefined}
      borderLeftWidth={isMentioned ? 3 : 0}
      borderLeftColor={isMentioned ? '$yellow8' : undefined}
    >
      {parts.map((part, i) =>
        part.type === 'mention' ? (
          <MentionChip
            key={i}
            publicKey={part.value.slice(1)}
            serverUrl={serverUrl}
            identity={identity}
            isOwn={part.value.slice(1) === identity.publicKey}
          />
        ) : (
          <Text key={i} fontSize="$3" color="$color">{part.value}</Text>
        )
      )}
    </XStack>
  )
}