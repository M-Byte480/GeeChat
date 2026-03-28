import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useIdentity } from 'app/features/home/identity/IdentityContext'
import { MessageRow } from 'app/features/home/components/MessageRow'
import { Paragraph, ScrollView, YStack } from '@my/ui'
import { Message } from 'app/features/home/types/types'
import { MessageRowSkeleton } from 'app/features/home/chat/MessageRowSkeleton'

type Props = {
  messages: Message[]
  isLoading: boolean
  serverUrl: string
  typingUser?: string | null
  scrollbarVisible?: boolean
  insetScrollbar?: boolean
}

export const MessageList = memo(
  ({
    messages,
    isLoading,
    serverUrl,
    typingUser,
    scrollbarVisible,
    insetScrollbar,
  }: Props) => {
    const INITIAL_LIMIT = 20
    const [limit, setLimit] = useState(INITIAL_LIMIT)

    const scrollViewRef = useRef<{
      scrollToEnd: (opts: { animated: boolean }) => void
    } | null>(null)
    const isAtBottomRef = useRef(true)
    const initialLoadRef = useRef(true)
    const { identity } = useIdentity()

    const visibleMessages = useMemo(
      () => messages.slice(-limit),
      [messages, limit]
    )

    const skeletons = useMemo(
      () =>
        Array.from({ length: 14 }).map((_, i) => (
          <MessageRowSkeleton key={`skeleton-${i}`} />
        )),
      []
    )

    const handleScroll = useCallback(
      (event: {
        nativeEvent: {
          contentOffset: { y: number }
          layoutMeasurement: { height: number }
          contentSize: { height: number }
        }
      }) => {
        const { contentOffset, layoutMeasurement, contentSize } =
          event.nativeEvent
        if (contentOffset.y < 100 && limit < messages.length) {
          setLimit((prev) => Math.min(prev + 50, messages.length))
        }
        isAtBottomRef.current =
          layoutMeasurement.height + contentOffset.y >= contentSize.height - 80
      },
      [limit, messages.length]
    )

    useEffect(() => {
      if (messages.length === 0) return

      if (initialLoadRef.current) {
        initialLoadRef.current = false
        requestAnimationFrame(() => {
          scrollViewRef.current?.scrollToEnd({ animated: false })
        })
        return
      }

      const latest = messages[messages.length - 1]
      if (isAtBottomRef.current || latest?.senderId === identity.publicKey) {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            scrollViewRef.current?.scrollToEnd({ animated: false })
          })
        })
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [messages])

    const messageList = useMemo(
      () =>
        visibleMessages.map((msg) => (
          <MessageRow key={msg.id} message={msg} serverUrl={serverUrl} />
        )),
      [visibleMessages, serverUrl]
    )

    return (
      <ScrollView
        ref={scrollViewRef}
        // @ts-ignore — className is web-only, not in RN types
        className={scrollbarVisible ? 'chat-area-scrollbar' : undefined}
        flex={1}
        mb="$2"
        mr={insetScrollbar ? -3 : 0}
        onScroll={handleScroll}
        scrollEventThrottle={100}
      >
        <YStack gap="$2">{isLoading ? skeletons : messageList}</YStack>
        {typingUser && (
          <Paragraph size="$1" color="$gray10" mt="$2">
            {typingUser} is typing...
          </Paragraph>
        )}
      </ScrollView>
    )
  }
)
