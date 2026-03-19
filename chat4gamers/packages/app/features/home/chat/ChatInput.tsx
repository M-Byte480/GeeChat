import {useChatInput} from "app/features/home/hooks/useChatInput";
import {useServerMembers} from "app/features/home/hooks/useServerMembers";
import {useIdentity} from "app/features/home/identity/IdentityContext";
import {Button, Input, XStack} from "@my/ui";
import {EmojiPicker} from "app/features/home/components/EmojiPicker";
import {Send} from "@tamagui/lucide-icons";
import {useCallback, useEffect, useMemo, useRef, useState} from "react";



export const ChatInput = ({ channelId, serverUrl, onSend }) => {
  const {identity} = useIdentity()
  const members = useServerMembers(serverUrl)

  const {
    inputText,
    mentionQuery,
    handleInputChange,
    handleSend,
    insertMention,
  } = useChatInput({channelId, identity, serverUrl, onSend})

  const inputTextRef = useRef(inputText)
  inputTextRef.current = inputText

  const selectionRef = useRef({ start: 0, end: 0 });
  const inputRef = useRef<any>(null)

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

  return(
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
  )
}