import { Text, XStack, YStack } from '@my/ui'
import { useUser } from '../hooks/useUser'
import type { Identity } from '../identity'
import ReactMarkdown from 'react-markdown'
import { ExternalLinkDialog } from 'app/features/home/components/ExternalLinkDialog'
import { useState } from 'react'
import remarkGfm from 'remark-gfm'

interface Props {
  content: string
  serverUrl: string
  identity: Identity
}

// Splits message content into plain text and mention tokens
function parseContent(content: string): Array<{ type: 'text' | 'mention'; value: string }> {
  const parts = content.split(/(@[A-Za-z0-9_-]{32,})/g)
  return parts.map((part) => ({
    type: part.match(/^@[A-Za-z0-9_-]{32,}$/) ? 'mention' : 'text',
    value: part,
  }))
}

function MentionChip({
  publicKey,
  serverUrl,
  identity,
}: {
  publicKey: string
  serverUrl: string
  identity: Identity
}) {
  const user = useUser(serverUrl, publicKey, identity)
  return (
    <Text bg={'$blue5'} color={'$blue11'} borderRadius="$2" px="$1" fontWeight="600" fontSize="$3">
      @{user?.nickname ?? user?.username ?? publicKey.slice(0, 8)}
    </Text>
  )
}

function isSafeUrl(href: string): boolean {
  try {
    const url = new URL(href)
    return url.protocol === 'https:' || url.protocol === 'http:'
  } catch {
    return false
  }
}

export function MentionText({ content, serverUrl, identity }: Props) {
  const parts = parseContent(content)
  const isMentioned = parts.some(
    (p) => p.type === 'mention' && p.value.slice(1) === identity.publicKey
  )
  const [pendingUrl, setPendingUrl] = useState<string | null>(null)

  return (
    <XStack flexWrap="wrap" alignItems="flex-start" gap="$1">
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
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            key={i}
            components={{
              // Map markdown elements to Tamagui Text
              p: ({ children }) => (
                <Text fontSize="$3" color="$color" userSelect="text">
                  {children}
                </Text>
              ),
              strong: ({ children }) => (
                <Text fontSize="$3" fontWeight="700" color="$color" userSelect="text">
                  {children}
                </Text>
              ),
              em: ({ children }) => (
                <Text fontSize="$3" fontStyle="italic" color="$color" userSelect="text">
                  {children}
                </Text>
              ),
              code: ({ children }) => (
                <Text
                  fontSize="$2"
                  fontFamily="$mono"
                  bg="$color4"
                  color="$color"
                  px="$1"
                  borderRadius="$1"
                  userSelect="text"
                >
                  {children}
                </Text>
              ),
              pre: ({ children }) => (
                <YStack
                  bg="$color3"
                  borderRadius="$3"
                  p="$3"
                  my="$1"
                  width="100%"
                  userSelect="text"
                >
                  <Text fontSize="$2" fontFamily="$mono" color="$color" userSelect="text">
                    {children}
                  </Text>
                </YStack>
              ),
              a: ({ href, children }) => {
                if (!href || !isSafeUrl(href))
                  return (
                    <Text fontSize="$3" color="$color9" userSelect="text">
                      {children}
                    </Text>
                  )
                return (
                  <Text
                    fontSize="$3"
                    color="$blue10"
                    textDecorationLine="underline"
                    cursor="pointer"
                    userSelect="text"
                    onPress={() => setPendingUrl(href)}
                  >
                    {children}
                  </Text>
                )
              },
            }}
          >
            {part.value}
          </ReactMarkdown>
        )
      )}
      {pendingUrl && <ExternalLinkDialog url={pendingUrl} onClose={() => setPendingUrl(null)} />}
    </XStack>
  )
}
