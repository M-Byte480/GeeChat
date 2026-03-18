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
  console.log('Parsed content parts:', parts) // Debug log to check the parsing result
  return parts.map(part => ({
    type: part.match(/^@[A-Za-z0-9_-]{32,}$/) ? 'mention' : 'text',
    value: part,
  }))
}

function MentionChip({ publicKey, serverUrl, identity }: {
  publicKey: string
  serverUrl: string
  identity: Identity
}) {
  const user = useUser(serverUrl, publicKey, identity)
  return (
    <Text
      bg="$blue5"
      color="$blue11"
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
  return (
    <XStack flexWrap="wrap" alignItems="center" gap="$1">
      {parts.map((part, i) =>
        part.type === 'mention' ? (
          <MentionChip
            key={i}
            publicKey={part.value.slice(1)} // strip the @
            serverUrl={serverUrl}
            identity={identity}
          />
        ) : (
          <Text key={i} fontSize="$3" color="$color">{part.value}</Text>
        )
      )}
    </XStack>
  )
}