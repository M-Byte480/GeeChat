import { XStack, YStack, Input, ScrollView, Text, Button, Paragraph } from '@my/ui'
import { Send, X } from '@tamagui/lucide-icons'
import { useState, useEffect, useRef, useCallback, useMemo, Profiler } from 'react'
import { useMessages } from '../hooks/useMessages'
import { ImageLightbox } from '../components/ImageLightbox'
import { ExternalLinkDialog } from '../components/ExternalLinkDialog'
import { EmojiPicker } from '../components/EmojiPicker'
import { MessageRow } from 'app/features/home/components/MessageRow'
import { useServerMembers } from 'app/features/home/hooks/useServerMembers'
import { useChatInput } from 'app/features/home/hooks/useChatInput'
import { useIdentity } from 'app/features/home/identity/IdentityContext'
import { useWhyDidYouRender } from 'app/features/home/hooks/useWhyDidYouRender'
import { onRender } from 'app/features/home/screen'
import { ChatInput } from 'app/features/home/chat/ChatInput'
import { MessageList } from 'app/features/home/chat/MessageList'
import type { User } from 'app/features/home/types/User'

type Props = {
  channelId: string
  serverUrl: string
  members: User[]
}

export const ChatArea = ({ channelId, serverUrl, members }: Props) => {
  const { identity } = useIdentity()
  const {
    inputText,
    setInputText,
    mentionQuery,
    handleInputChange,
    handleSend,
    insertMention,
    socketRef,
  } = useChatInput({
    channelId,
    identity,
    serverUrl,
    onSend: async (text) => {
      await sendMessage(text)
    },
  })

  const { messages, typingUser, errorBanner, setErrorBanner, sendMessage } = useMessages({
    channelId,
    identity,
    serverUrl,
    socketRef,
  })

  const filteredMembers =
    mentionQuery !== null
      ? members.filter((m) =>
          (m.nickname ?? m.username).toLowerCase().includes(mentionQuery.toLowerCase())
        )
      : []

  const [pendingUrl, setPendingUrl] = useState<string | null>(null)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)

  const initialLoadRef = useRef(true)

  // Reset scroll state when switching channels
  useEffect(() => {
    initialLoadRef.current = true
  }, [channelId])

  useWhyDidYouRender('ChatArea', {
    channelId,
    serverUrl,
    identity,
  })
  return (
    <YStack flex={1} pl={'$2'} pb="$4" bg="$background" height="100%" userSelect="auto">
      {errorBanner && false && (
        <XStack
          bg="$red9"
          px="$4"
          py="$2"
          mb="$3"
          borderRadius="$3"
          alignItems="center"
          gap="$3"
          animation="quick"
          enterStyle={{ opacity: 0, y: -8 }}
        >
          <Text color="white" flex={1} fontSize="$3">
            {errorBanner}
          </Text>
          <Button
            size="$2"
            chromeless
            icon={X}
            color="white"
            onPress={() => setErrorBanner(null)}
          />
        </XStack>
      )}

      <Profiler id={'ScrollView'} onRender={onRender}>
        <MessageList messages={messages} serverUrl={serverUrl} typingUser={typingUser} />
      </Profiler>
      {filteredMembers.length > 0 && (
        <Profiler id={'filteredMembers.length'} onRender={onRender}>
          <YStack
            position="absolute"
            bottom={60}
            left={0}
            right={0}
            bg="$background"
            borderWidth={1}
            borderColor="$borderColor"
            borderRadius="$3"
            elevation="$4"
            zIndex={100}
          >
            {filteredMembers.map((member) => (
              <XStack
                key={member.publicKey}
                p="$2"
                hoverStyle={{ bg: '$color3' }}
                onPress={() => insertMention(member.publicKey)}
                cursor="pointer"
              >
                <Text fontWeight="600">{member.nickname ?? member.username}</Text>
              </XStack>
            ))}
          </YStack>
        </Profiler>
      )}

      <Profiler id={'Type a message...'} onRender={onRender}>
        <ChatInput
          key={channelId}
          channelId={channelId}
          serverUrl={serverUrl}
          onSend={sendMessage}
        />
      </Profiler>

      <Profiler id={'Some Boxes'} onRender={onRender}>
        {lightboxUrl && <ImageLightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />}
        {pendingUrl && <ExternalLinkDialog url={pendingUrl} onClose={() => setPendingUrl(null)} />}
      </Profiler>
    </YStack>
  )
}
