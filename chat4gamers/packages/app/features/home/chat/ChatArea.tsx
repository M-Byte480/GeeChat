import { YStack } from '@my/ui'
import { Profiler, useCallback, useEffect, useRef, useState } from 'react'
import { useMessages } from '../hooks/useMessages'
import { ImageLightbox } from '../components/ImageLightbox'
import { ExternalLinkDialog } from '../components/ExternalLinkDialog'
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
  showMemberPane?: boolean
}

export const ChatArea = ({
  channelId,
  serverUrl,
  members,
  showMemberPane,
}: Props) => {
  const { identity } = useIdentity()
  const socketRef = useRef<WebSocket | null>(null)

  const { messages, isLoading, typingUser, sendMessage } = useMessages({
    channelId,
    identity,
    serverUrl,
    socketRef,
  })

  const [pendingUrl, setPendingUrl] = useState<string | null>(null)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)

  const initialLoadRef = useRef(true)
  const [chatHovered, setChatHovered] = useState(false)

  // Reset scroll state when switching channels
  useEffect(() => {
    initialLoadRef.current = true
  }, [channelId])

  const handleChatMouseEnter = useCallback(() => setChatHovered(true), [])
  const handleChatMouseLeave = useCallback(() => setChatHovered(false), [])

  useWhyDidYouRender('ChatArea', {
    channelId,
    serverUrl,
    identity,
  })
  return (
    <YStack
      flex={1}
      pl={'$2'}
      pb="$4"
      bg="$background"
      height="100%"
      userSelect="auto"
      // @ts-ignore — web-only events, not in RN types
      onMouseEnter={handleChatMouseEnter}
      onMouseLeave={handleChatMouseLeave}
    >
      {/* TODO: re-enable error banner — currently disabled */}

      <Profiler id={'ScrollView'} onRender={onRender}>
        <MessageList
          key={channelId}
          messages={messages}
          isLoading={isLoading}
          serverUrl={serverUrl}
          typingUser={typingUser}
          scrollbarVisible={chatHovered}
          insetScrollbar={showMemberPane}
        />
      </Profiler>

      <Profiler id={'Type a message...'} onRender={onRender}>
        <ChatInput
          channelId={channelId}
          onSend={sendMessage}
          socketRef={socketRef}
          members={members}
        />
      </Profiler>

      <Profiler id={'Some Boxes'} onRender={onRender}>
        {lightboxUrl && (
          <ImageLightbox
            url={lightboxUrl}
            onClose={() => setLightboxUrl(null)}
          />
        )}
        {pendingUrl && (
          <ExternalLinkDialog
            url={pendingUrl}
            onClose={() => setPendingUrl(null)}
          />
        )}
      </Profiler>
    </YStack>
  )
}
