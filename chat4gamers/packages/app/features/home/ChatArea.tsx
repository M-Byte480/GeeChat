import { XStack, YStack, Input, ScrollView, Image, Text, Button, Paragraph } from '@my/ui'
import { Send, X } from '@tamagui/lucide-icons'
import { useState, useEffect, useRef, useCallback } from 'react'
import type { Identity } from './identity/types'
import { useMessages } from './hooks/useMessages'
import { MessageContent } from './components/MessageContent'
import { ImageLightbox } from './components/ImageLightbox'
import { ExternalLinkDialog } from './components/ExternalLinkDialog'
import {ChannelBanner} from "app/features/home/channel/ChannelBanner";

type Props = {
  identity: Identity
  channelId: string
}

export const ChatArea = ({ identity, channelId }: Props) => {
  const { messages, inputText, typingUser, errorBanner, setErrorBanner, sendMessage, handleInputChange } =
    useMessages({ channelId, identity })

  const [pendingUrl, setPendingUrl] = useState<string | null>(null)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)

  const scrollViewRef = useRef<any>(null)
  const isAtBottomRef = useRef(true)
  const initialLoadRef = useRef(true)

  // Reset scroll state when switching channels
  useEffect(() => {
    initialLoadRef.current = true
  }, [channelId])

  const scrollToBottom = useCallback((animated = true) => {
    requestAnimationFrame(() => {
      scrollViewRef.current?.scrollToEnd({ animated })
    })
  }, [])

  const handleScroll = useCallback((event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent
    isAtBottomRef.current = layoutMeasurement.height + contentOffset.y >= contentSize.height - 80
  }, [])

  // Scroll on new messages — instant on first load, smart on subsequent
  useEffect(() => {
    if (messages.length === 0) return
    if (initialLoadRef.current) {
      initialLoadRef.current = false
      scrollToBottom(false)
      return
    }
    const latest = messages[messages.length - 1]
    if (isAtBottomRef.current || latest?.senderId === identity.publicKey) {
      scrollToBottom(true)
    }
  }, [messages, identity.publicKey, scrollToBottom])

  return (
    <YStack flex={1} pl={"$2"} pb="$4" bg="$background" height="100%" >
      {errorBanner && false && (
        <XStack
          bg="$red9" px="$4" py="$2" mb="$3" borderRadius="$3"
          alignItems="center" gap="$3" animation="quick" enterStyle={{ opacity: 0, y: -8 }}
        >
          <Text color="white" flex={1} fontSize="$3">{errorBanner}</Text>
          <Button size="$2" chromeless icon={X} color="white" onPress={() => setErrorBanner(null)} />
        </XStack>
      )}

      <ScrollView ref={scrollViewRef} flex={1} mb="$2" onScroll={handleScroll} scrollEventThrottle={100}>
        <YStack gap="$2">
          {messages.map(msg => (
            <XStack key={msg.id} gap="$3" alignItems="flex-start">
              <Image src="favicon.ico" width={40} height={40} borderRadius="$10" />
              <YStack flex={1} gap="$1">
                <XStack gap="$2" alignItems="center">
                  <Text fontWeight="bold" fontSize="$3">{msg.senderName || msg.senderId}</Text>
                  <Text fontSize="$1" color="$gray10">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </XStack>
                <MessageContent content={msg.content} onLinkPress={setPendingUrl} onImagePress={setLightboxUrl} />
              </YStack>
            </XStack>
          ))}
        </YStack>
        {typingUser && (
          <Paragraph size="$1" color="$gray10" mt="$2">{typingUser} is typing...</Paragraph>
        )}
      </ScrollView>

      <XStack gap="$2" alignItems="center">
        <Input
          flex={1}
          placeholder="Type a message..."
          size="$4"
          value={inputText}
          onChangeText={handleInputChange}
          onSubmitEditing={sendMessage}
        />
        <Button size="$4" icon={Send} onPress={sendMessage} disabled={!inputText.trim()} theme="active" />
      </XStack>

      <ImageLightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />
      <ExternalLinkDialog url={pendingUrl} onClose={() => setPendingUrl(null)} />
    </YStack>
  )
}
