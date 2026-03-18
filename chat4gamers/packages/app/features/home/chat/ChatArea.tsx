import { XStack, YStack, Input, ScrollView, Image, Text, Button, Paragraph } from '@my/ui'
import { Send, X } from '@tamagui/lucide-icons'
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import type { Identity } from '../identity/types'
import { useMessages } from '../hooks/useMessages'
import { ImageLightbox } from '../components/ImageLightbox'
import { ExternalLinkDialog } from '../components/ExternalLinkDialog'
import { EmojiPicker } from '../components/EmojiPicker'
import {MessageRow} from "app/features/home/components/MessageRow";
import {useServerMembers} from "app/features/home/hooks/useServerMembers";
import {User} from "app/features/home/types/User";
import {useChatInput} from "app/features/home/hooks/useChatInput";

type Props = {
  identity: Identity
  channelId: string
  serverUrl: string
}

export const ChatArea = ({ identity, channelId, serverUrl }: Props) => {
  const members = useServerMembers(serverUrl)

  const {
    inputText,
    setInputText,
    mentionQuery,
    handleInputChange,
    handleSend,
    insertMention,
    socketRef,
  } = useChatInput({ channelId, identity, serverUrl, onSend: async (text) => {
      await sendMessage(text)
    }})

  const {
    messages,
    typingUser,
    errorBanner,
    setErrorBanner,
    sendMessage,
  } = useMessages({ channelId, identity, serverUrl, socketRef })

  const filteredMembers = mentionQuery !== null
    ? members.filter(m =>
      (m.nickname ?? m.username).toLowerCase().includes(mentionQuery.toLowerCase())
    )
    : []


  const selectionRef = useRef({ start: 0, end: 0 });
  const inputRef = useRef<any>(null)
  const inputTextRef = useRef(inputText)
  inputTextRef.current = inputText

  const [pendingUrl, setPendingUrl] = useState<string | null>(null)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)

  const handleEmojiSelect = useCallback((emoji: string, keepOpen: boolean) => {
    const { start, end } = selectionRef.current
    const newText = inputTextRef.current.substring(0, start) + emoji + inputTextRef.current.substring(end)
    handleInputChange(newText)
    const newPos = start + emoji.length
    selectionRef.current = { start: newPos, end: newPos }
    // Only refocus when the picker is closing — shift+clicking keeps the picker
    // open and calling focus() with shift held would extend the selection
    if (!keepOpen) requestAnimationFrame(() => inputRef.current?.focus())
  }, [handleInputChange])

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


  const messageList = useMemo(() => (
    messages.map(msg => (
      <MessageRow key={msg.id}
                  message={msg} serverUrl={serverUrl} identity={identity}/>
    ))
  ), [messages, serverUrl, identity?.publicKey])


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
          {messageList}
        </YStack>
        {typingUser && (
          <Paragraph size="$1" color="$gray10" mt="$2">{typingUser} is typing...</Paragraph>
        )}
      </ScrollView>

      {filteredMembers.length > 0 && (
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
          {filteredMembers.map(member => (
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
      )}

      <XStack gap="$2" alignItems="center" position="relative">
        <Input
          ref={inputRef}
          flex={1}
          placeholder="Type a message..."
          size="$4"
          value={inputText}
          onChangeText={handleInputChange}
          onSelectionChange={(e) => {
            selectionRef.current = e.nativeEvent.selection;
          }}
          onSubmitEditing={handleSend}
        />
        <EmojiPicker onSelect={handleEmojiSelect} />
        <Button size="$4" icon={Send} onPress={handleSend} disabled={!inputText.trim()} theme="active" />
      </XStack>

      <ImageLightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />
      <ExternalLinkDialog url={pendingUrl} onClose={() => setPendingUrl(null)} />
    </YStack>
  )
}
