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
  onFetchOlder?: () => void
  hasMoreHistory?: boolean
}

type ScrollableNode = { getScrollableNode?: () => HTMLElement }

export const MessageList = memo(
  ({
    messages,
    isLoading,
    serverUrl,
    typingUser,
    scrollbarVisible,
    insetScrollbar,
    onFetchOlder,
    hasMoreHistory,
  }: Props) => {
    const INITIAL_LIMIT = 50
    const [limit, setLimit] = useState(INITIAL_LIMIT)

    const scrollViewRef = useRef<{
      scrollToEnd: (opts: { animated: boolean }) => void
    } | null>(null)
    const isAtBottomRef = useRef(true)
    const initialLoadRef = useRef(true)
    // Infinity = no scroll recorded yet, so the rAF useEffect never false-fires on mount
    const scrollYRef = useRef(Infinity)
    const prevLastIdRef = useRef<number | string | null>(null)
    // Captures scroll state just before a server fetch so we can restore position after prepend
    const prependAnchorRef = useRef<{
      scrollTop: number
      scrollHeight: number
    } | null>(null)
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

    // When older messages are prepended from the server the first message ID
    // changes. Expand the visible window to include all newly prepended messages,
    // then restore scroll position so the user doesn't jump to the top.
    const prevFirstIdRef = useRef<number | string | null>(null)
    useEffect(() => {
      const firstId = messages[0]?.id ?? null
      if (
        firstId !== null &&
        prevFirstIdRef.current !== null &&
        firstId !== prevFirstIdRef.current
      ) {
        setLimit(messages.length)
        // After the DOM updates with the new rows, shift scrollTop down by the
        // height of the prepended content so the user stays at the same visual position.
        requestAnimationFrame(() => {
          const anchor = prependAnchorRef.current
          const scrollNode = (
            scrollViewRef.current as unknown as ScrollableNode
          )?.getScrollableNode?.()
          if (anchor && scrollNode) {
            const delta = scrollNode.scrollHeight - anchor.scrollHeight
            if (delta > 0) {
              scrollNode.scrollTop = anchor.scrollTop + delta
              scrollYRef.current = anchor.scrollTop + delta
            }
          }
          prependAnchorRef.current = null
        })
      }
      prevFirstIdRef.current = firstId
    }, [messages])

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

        if (contentOffset.y < 100) {
          if (limit < messages.length) {
            // More messages in local cache — expand visible window
            setLimit((prev) => Math.min(prev + 50, messages.length))
          } else if (hasMoreHistory) {
            // All local cache shown — fetch older from server.
            // Snapshot scroll state so we can restore position after prepend.
            const scrollNode = (
              scrollViewRef.current as unknown as ScrollableNode
            )?.getScrollableNode?.()
            if (scrollNode) {
              prependAnchorRef.current = {
                scrollTop: scrollNode.scrollTop,
                scrollHeight: scrollNode.scrollHeight,
              }
            }
            onFetchOlder?.()
          }
        }

        isAtBottomRef.current =
          layoutMeasurement.height + contentOffset.y >= contentSize.height - 80
      },
      [limit, messages.length, hasMoreHistory, onFetchOlder]
    )

    useEffect(() => {
      // Don't scroll while skeleton is showing — content height is wrong.
      // When isLoading flips to false this effect re-runs with the real messages.
      if (messages.length === 0 || isLoading) return

      const latest = messages[messages.length - 1]
      const latestId = latest?.id ?? null
      const isAppend = latestId !== prevLastIdRef.current
      prevLastIdRef.current = latestId

      if (initialLoadRef.current) {
        initialLoadRef.current = false
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            scrollViewRef.current?.scrollToEnd({ animated: false })
          })
        })
        return
      }

      // Only scroll to bottom when a new message was appended (latest ID changed).
      // When older messages are prepended the latest ID is unchanged — don't jump.
      if (
        isAppend &&
        (isAtBottomRef.current || latest?.senderId === identity.publicKey)
      ) {
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
        // @ts-expect-error — className is web-only, not in RN types
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
