import {useChatInput} from 'app/features/home/hooks/useChatInput'
import {useIdentity} from 'app/features/home/identity/IdentityContext'
import {Button, Input, Text, XStack, YStack} from '@my/ui'
import {EmojiPicker} from 'app/features/home/components/EmojiPicker'
import {Send} from '@tamagui/lucide-icons'
import {useCallback, useLayoutEffect, useRef} from 'react'

export const ChatInput = ({channelId, onSend, socketRef, members}) => {
    const {identity} = useIdentity()
    const {
        inputText,
        mentionQuery,
        handleInputChange,
        handleSend,
        insertMention,
    } = useChatInput({
        channelId,
        identity,
        onSend,
        socketRef,
    })

    const inputTextRef = useRef(inputText)
    useLayoutEffect(() => {
        inputTextRef.current = inputText
    })
    const selectionRef = useRef({start: 0, end: 0})
    const inputRef = useRef<{ focus: () => void } | null>(null)

    const filteredMembers =
        mentionQuery !== null
            ? members.filter((m) =>
                (m.nickname ?? m.username)
                    .toLowerCase()
                    .includes(mentionQuery.toLowerCase())
            )
            : []

    const handleEmojiSelect = useCallback(
        (emoji: string, keepOpen: boolean) => {
            const {start, end} = selectionRef.current
            const newText =
                inputTextRef.current.substring(0, start) +
                emoji +
                inputTextRef.current.substring(end)
            handleInputChange(newText)
            const newPos = start + emoji.length
            selectionRef.current = {start: newPos, end: newPos}
            if (!keepOpen) requestAnimationFrame(() => inputRef.current?.focus())
        },
        [handleInputChange]
    )

    return (
        <XStack gap="$2" alignItems="center" position="relative">
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
                    {filteredMembers.map((member) => (
                        <XStack
                            key={member.publicKey}
                            p="$2"
                            hoverStyle={{bg: '$color3'}}
                            onPress={() => insertMention(member.publicKey)}
                            cursor="pointer"
                        >
                            <Text fontWeight="600">{member.nickname ?? member.username}</Text>
                        </XStack>
                    ))}
                </YStack>
            )}
            <Input
                ref={inputRef}
                flex={1}
                placeholder="Type a message..."
                size="$4"
                value={inputText}
                onChangeText={handleInputChange}
                onSelectionChange={(e) => {
                    selectionRef.current = e.nativeEvent.selection
                }}
                onSubmitEditing={handleSend}
            />
            <EmojiPicker onSelect={handleEmojiSelect}/>
            <Button
                size="$4"
                icon={Send}
                onPress={handleSend}
                disabled={!inputText.trim()}
                theme="active"
            />
        </XStack>
    )
}
