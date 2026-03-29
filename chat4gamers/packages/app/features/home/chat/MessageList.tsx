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
    const INITIAL_LIMIT = 50
    const [limit, setLimit] = useState(INITIAL_LIMIT)

    const scrollViewRef = useRef<{
      scrollToEnd: (opts: { animated: boolean }) => void
    } | null>(null)
    const isAtBottomRef = useRef(true)
    const initialLoadRef = useRef(true)
    const scrollYRef = useRef(0)
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
        scrollYRef.current = contentOffset.y
        if (contentOffset.y < 100 && limit < messages.length) {
          setLimit((prev) => Math.min(prev + 50, messages.length))
        }
        isAtBottomRef.current =
          layoutMeasurement.height + contentOffset.y >= contentSize.height - 80
      },
      [limit, messages.length]
    )

    // After a limit increase, the DOM re-renders with new content above the current
    // scroll position. On web the scroll event may not re-fire even if we're still
    // near y=0, so we check once via rAF and load another batch if needed.
    useEffect(() => {
      if (limit >= messages.length) return
      const id = requestAnimationFrame(() => {
        if (scrollYRef.current < 100) {
          setLimit((prev) => Math.min(prev + 50, messages.length))
        }
      })
      return () => cancelAnimationFrame(id)
    }, [limit, messages.length])

    useEffect(() => {
      // Don't scroll while skeleton is showing — content height is wrong.
      // When isLoading flips to false this effect re-runs with the real messages.
      if (messages.length === 0 || isLoading) return

      if (initialLoadRef.current) {
        initialLoadRef.current = false
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            scrollViewRef.current?.scrollToEnd({ animated: false })
          })
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
    }, [messages, isLoading])

    const messageList = useMemo(
      () =>
        visibleMessages.map((msg, i) => {
          const prev = visibleMessages[i - 1]
          const showHeader =
            !prev ||
            prev.senderId !== msg.senderId ||
            new Date(msg.timestamp).getTime() -
              new Date(prev.timestamp).getTime() >
              5 * 60_000
          return (
            <MessageRow
              key={msg.id}
              message={msg}
              serverUrl={serverUrl}
              identity={identity}
              showHeader={showHeader}
              isFirst={i === 0}
            />
          )
        }),
      [visibleMessages, serverUrl, identity]
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
        <YStack>{isLoading ? skeletons : messageList}</YStack>
        {typingUser && (
          <Paragraph size="$1" color="$gray10" mt="$2">
            {typingUser} is typing...
          </Paragraph>
        )}
      </ScrollView>
    )
  }
)
