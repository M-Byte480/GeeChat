import {memo, useCallback, useEffect, useMemo, useRef, useState} from "react";
import {useIdentity} from "app/features/home/identity/IdentityContext";
import {MessageRow} from "app/features/home/components/MessageRow";
import {Paragraph, ScrollView, YStack} from "@my/ui";
import {Message} from "app/features/home/types/types";
import {MessageRowSkeleton} from "app/features/home/chat/MessageRowSkeleton";

type Props = {
  messages: Message[]
  serverUrl: string
  typingUser?: string | null
}

export const MessageList = memo(({ messages, serverUrl, typingUser }: Props) => {
  const INITIAL_LIMIT = 20
  const [limit, setLimit] = useState(INITIAL_LIMIT);
  const [isReady, setIsReady] = useState(false)
  const [hasFetched, setHasFetched] = useState(false)

  // Reset when channel changes
  useEffect(() => {
    setIsReady(false)
    setHasFetched(false)
  }, [serverUrl])

  useEffect(() => {
    if (!hasFetched) setHasFetched(true)
  }, [messages])

  const isEmpty = hasFetched && messages.length === 0
  const showSkeletons = !isReady && !isEmpty

  const scrollViewRef = useRef<any>(null)
  const isAtBottomRef = useRef(true)
  const { identity } = useIdentity()

  const visibleMessages = useMemo(() =>
      messages.slice(-limit),
    [messages, limit])

  const initialLoadRef = useRef(true)

  const skeletons = useMemo(() =>
      Array.from({ length: 14 }).map((_, i) => (
        <MessageRowSkeleton key={`skeleton-${i}`} />
      ))
    , [])

  useEffect(() => {
    initialLoadRef.current = true
  }, []) // reset on mount

  const handleScroll = useCallback((event: any) => {
    const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent
    if (contentOffset.y < 100 && limit < messages.length) {
      setLimit(prev => Math.min(prev + 50, messages.length))
    }
    isAtBottomRef.current = layoutMeasurement.height + contentOffset.y >= contentSize.height - 80
  }, [limit, messages.length])

  useEffect(() => {
    if (messages.length === 0) return

    if (initialLoadRef.current) {
      initialLoadRef.current = false
      // Give rows time to paint before jumping to bottom
        scrollViewRef.current?.scrollToEnd({ animated: false })
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
  }, [messages])

  const messageList = useMemo(() =>
      visibleMessages.map((msg, index) => (
        <MessageRow
          key={msg.id}
          message={msg}
          serverUrl={serverUrl}
          onLayout={index === visibleMessages.length - 1 ? () => setIsReady(true) : undefined}
        />
      ))
    , [visibleMessages, serverUrl])

  return (
    <ScrollView ref={scrollViewRef} flex={1} mb="$2" onScroll={handleScroll} scrollEventThrottle={100}  >
      <YStack gap="$2">
        {skeletons}
        {/* Render messages on top of skeletons, hidden until ready */}
        <YStack display={isReady ? 'flex' : 'none'}>
          {messageList}
        </YStack>
      </YStack>
      {typingUser && (
        <Paragraph size="$1" color="$gray10" mt="$2">{typingUser} is typing...</Paragraph>
      )}
    </ScrollView>
  )
})