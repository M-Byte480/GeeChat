import { Text, XStack, YStack } from '@my/ui'
import { useUser } from '../hooks/useUser'
import type { Identity } from '../identity'
import ReactMarkdown from 'react-markdown'
import { ExternalLinkDialog } from 'app/features/home/components/ExternalLinkDialog'
import { AuthImage } from 'app/features/home/components/AuthImage'
import { ImageLightbox } from 'app/features/home/components/ImageLightbox'
import { memo, useMemo, useState } from 'react'
import remarkGfm from 'remark-gfm'

interface Props {
  content: string
  serverUrl: string
  identity: Identity
}

const URL_RE = /(https?:\/\/[^\s<>"{}|\\^`[\]]+)/g
const IMAGE_EXT = /\.(webp|jpe?g|png|gif)(\?[^\s]*)?$/i
const VIDEO_EXT = /\.(mp4|webm)(\?[^\s]*)?$/i

type Token =
  | { type: 'text'; value: string }
  | { type: 'mention'; value: string }
  | { type: 'image'; value: string }
  | { type: 'video'; value: string }
  | { type: 'link'; value: string }

// Splits content into mention, image, video, link, and plain-text tokens.
// URL segments are extracted before reaching ReactMarkdown so they always
// render as media/links regardless of surrounding markdown syntax.
function parseContent(content: string): Token[] {
  const tokens: Token[] = []
  const mentionParts = content.split(/(@[A-Za-z0-9_-]{32,})/g)
  for (const part of mentionParts) {
    if (/^@[A-Za-z0-9_-]{32,}$/.test(part)) {
      tokens.push({ type: 'mention', value: part })
      continue
    }
    const urlParts = part.split(URL_RE)
    for (const seg of urlParts) {
      if (/^https?:\/\//.test(seg)) {
        if (IMAGE_EXT.test(seg)) tokens.push({ type: 'image', value: seg })
        else if (VIDEO_EXT.test(seg)) tokens.push({ type: 'video', value: seg })
        else tokens.push({ type: 'link', value: seg })
      } else if (seg) {
        tokens.push({ type: 'text', value: seg })
      }
    }
  }
  return tokens
}

// Markdown syntax characters — if absent, skip ReactMarkdown entirely
const MARKDOWN_RE = /[*_`~#[>\\]/

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

function isSafeUrl(href: string): boolean {
  try {
    const url = new URL(href)
    return url.protocol === 'https:' || url.protocol === 'http:'
  } catch {
    return false
  }
}

export const MentionText = memo(function MentionText({
  content,
  serverUrl,
  identity,
}: Props) {
  const parts = useMemo(() => parseContent(content), [content])
  const isMentioned = parts.some(
    (p) => p.type === 'mention' && p.value.slice(1) === identity.publicKey
  )
  const [pendingUrl, setPendingUrl] = useState<string | null>(null)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)

  // Native elements — safe in web/Electron, cast to avoid RN type errors
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Vid = 'video' as any

  const isLocalMedia = (url: string) => url.includes('/uploads/media/')

  return (
    <XStack
      width="100%"
      flexWrap="wrap"
      alignItems="flex-start"
      gap="$1"
      bg={isMentioned ? '$yellow5' : 'transparent'}
      borderLeftColor={isMentioned ? '$yellow9' : 'transparent'}
      borderLeftWidth={isMentioned ? 3 : 0}
      p={2}
      borderRadius="$1"
      mr="$2"
    >
      {parts.map((part, i) => {
        if (part.type === 'mention') {
          return (
            <MentionChip
              key={i}
              publicKey={part.value.slice(1)}
              serverUrl={serverUrl}
              identity={identity}
            />
          )
        }

        if (part.type === 'image') {
          return isLocalMedia(part.value) ? (
            <AuthImage
              key={i}
              src={part.value}
              serverUrl={serverUrl}
              onClick={(blobUrl) => setLightboxUrl(blobUrl)}
            />
          ) : (
            // External image — no auth needed
            // eslint-disable-next-line jsx-a11y/alt-text
            <img
              key={i}
              src={part.value}
              style={{ maxWidth: '100%', maxHeight: 300, borderRadius: 8, marginTop: 4, objectFit: 'contain', cursor: 'zoom-in', display: 'block' }}
              onClick={() => setLightboxUrl(part.value)}
            />
          )
        }

        if (part.type === 'video') {
          return (
            <Vid
              key={i}
              src={part.value}
              controls
              style={{ maxWidth: '100%', maxHeight: 300, borderRadius: 8, marginTop: 4 }}
            />
          )
        }

        if (part.type === 'link') {
          return (
            <Text
              key={i}
              fontSize="$3"
              color="$blue10"
              textDecorationLine="underline"
              cursor="pointer"
              userSelect="text"
              onPress={() => setPendingUrl(part.value)}
            >
              {part.value}
            </Text>
          )
        }

        // type === 'text'
        return !MARKDOWN_RE.test(part.value) ? (
          <Text key={i} fontSize="$3" color="$color" userSelect="text">
            {part.value}
          </Text>
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
                <Text
                  fontSize="$3"
                  fontWeight="700"
                  color="$color"
                  userSelect="text"
                >
                  {children}
                </Text>
              ),
              em: ({ children }) => (
                <Text
                  fontSize="$3"
                  fontStyle="italic"
                  color="$color"
                  userSelect="text"
                >
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
                  <Text
                    fontSize="$2"
                    fontFamily="$mono"
                    color="$color"
                    userSelect="text"
                  >
                    {children}
                  </Text>
                </YStack>
              ),
              img: ({ src, alt }) => (
                <YStack my="$2">
                  <img
                    src={src}
                    alt={alt ?? 'Image'}
                    style={{
                      maxWidth: '100%',
                      maxHeight: 300,
                      borderRadius: 8,
                      display: 'block',
                    }}
                  />
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
      })}
      {pendingUrl && (
        <ExternalLinkDialog url={pendingUrl} onClose={() => setPendingUrl(null)} />
      )}
      {lightboxUrl && (
        <ImageLightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />
      )}
    </XStack>
  )
})
