import { useChatInput } from 'app/features/home/hooks/useChatInput'
import { useIdentity } from 'app/features/home/identity/IdentityContext'
import { Button, Input, Text, XStack, YStack } from '@my/ui'
import { EmojiPicker } from 'app/features/home/components/EmojiPicker'
import { Paperclip, Send, X } from '@tamagui/lucide-icons'
import { apiFetch } from '@my/api-client'
import { useCallback, useLayoutEffect, useRef, useState } from 'react'

interface Attachment {
  id: string
  file: File
  localUrl: string
}

interface Props {
  channelId: string
  serverUrl: string
  onSend: (text: string) => Promise<void>
  socketRef: React.MutableRefObject<WebSocket | null>
  members: Array<{ publicKey: string; username: string; nickname?: string }>
}

export const ChatInput = ({ channelId, serverUrl, onSend, socketRef, members }: Props) => {
  const { identity } = useIdentity()
  const {
    inputText,
    mentionQuery,
    handleInputChange,
    handleSend,
    insertMention,
    reset,
  } = useChatInput({ channelId, identity, onSend, socketRef })

  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const inputTextRef = useRef(inputText)
  useLayoutEffect(() => { inputTextRef.current = inputText })
  const selectionRef = useRef({ start: 0, end: 0 })
  const inputRef = useRef<{ focus: () => void } | null>(null)

  const addAttachment = useCallback((file: File) => {
    const localUrl = URL.createObjectURL(file)
    setPendingAttachments((prev) => [...prev, { id: crypto.randomUUID(), file, localUrl }])
  }, [])

  const removeAttachment = useCallback((id: string) => {
    setPendingAttachments((prev) => {
      const att = prev.find((a) => a.id === id)
      if (att) URL.revokeObjectURL(att.localUrl)
      return prev.filter((a) => a.id !== id)
    })
  }, [])

  // Intercept image pastes from clipboard
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = Array.from(e.clipboardData?.items ?? [])
    const imageItem = items.find((item) => item.type.startsWith('image/'))
    if (imageItem) {
      const file = imageItem.getAsFile()
      if (file) {
        e.preventDefault()
        addAttachment(file)
      }
    }
  }, [addAttachment])

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    files.forEach(addAttachment)
    // Reset input so the same file can be selected again
    e.target.value = ''
  }, [addAttachment])

  const filteredMembers =
    mentionQuery !== null
      ? members.filter((m) =>
          (m.nickname ?? m.username).toLowerCase().includes(mentionQuery.toLowerCase())
        )
      : []

  const handleEmojiSelect = useCallback(
    (emoji: string, keepOpen: boolean) => {
      const { start, end } = selectionRef.current
      const newText =
        inputTextRef.current.substring(0, start) +
        emoji +
        inputTextRef.current.substring(end)
      handleInputChange(newText)
      const newPos = start + emoji.length
      selectionRef.current = { start: newPos, end: newPos }
      if (!keepOpen) requestAnimationFrame(() => inputRef.current?.focus())
    },
    [handleInputChange]
  )

  const handleSendClick = useCallback(async () => {
    if (pendingAttachments.length === 0) {
      handleSend()
      return
    }

    setIsUploading(true)
    setUploadError(null)
    try {
      const uploadedUrls = await Promise.all(
        pendingAttachments.map(async (att) => {
          const fd = new FormData()
          fd.append('file', att.file)
          const res = await apiFetch(serverUrl, '/upload', { method: 'POST', body: fd })
          if (!res.ok) {
            const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
            throw new Error(err.error ?? `Upload failed (${res.status})`)
          }
          const data = await res.json() as { url: string; thumbUrl: string }
          return `${serverUrl}${data.url}`
        })
      )

      const combined = [inputTextRef.current.trim(), ...uploadedUrls].filter(Boolean).join('\n')
      if (!combined) return

      reset()
      pendingAttachments.forEach((a) => URL.revokeObjectURL(a.localUrl))
      setPendingAttachments([])
      await onSend(combined)
    } catch (err) {
      console.error('[ChatInput] upload error:', err)
      setUploadError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setIsUploading(false)
    }
  }, [pendingAttachments, serverUrl, inputTextRef, reset, onSend, handleSend])

  const canSend = (inputText.trim().length > 0 || pendingAttachments.length > 0) && !isUploading

  return (
    <YStack gap="$2" position="relative">
      {/* Mention autocomplete */}
      {filteredMembers.length > 0 && (
        <YStack
          position="absolute"
          bottom={pendingAttachments.length > 0 ? 148 : 60}
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
      )}

      {/* Attachment preview strip */}
      {pendingAttachments.length > 0 && (
        <XStack
          gap="$2"
          px="$2"
          py="$1"
          flexWrap="nowrap"
          // @ts-expect-error web-only
          style={{ overflowX: 'auto' }}
        >
          {pendingAttachments.map((att) => (
            <YStack
              key={att.id}
              width={80}
              height={80}
              borderRadius="$3"
              overflow="hidden"
              position="relative"
              flexShrink={0}
              bg="$color4"
            >
              {att.file.type.startsWith('image/') ? (
                // eslint-disable-next-line jsx-a11y/alt-text
                <img
                  src={att.localUrl}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <YStack flex={1} alignItems="center" justifyContent="center">
                  <Text fontSize="$2" color="$gray10" textAlign="center" px="$1" numberOfLines={2}>
                    {att.file.name}
                  </Text>
                </YStack>
              )}
              {/* Remove button */}
              <XStack
                position="absolute"
                top={2}
                right={2}
                width={18}
                height={18}
                borderRadius={9}
                bg="rgba(0,0,0,0.7)"
                alignItems="center"
                justifyContent="center"
                cursor="pointer"
                onPress={() => removeAttachment(att.id)}
              >
                <X size={11} color="white" />
              </XStack>
            </YStack>
          ))}
        </XStack>
      )}

      {/* Upload error */}
      {uploadError && (
        <Text fontSize="$2" color="$red10" px="$2">
          {uploadError}
        </Text>
      )}

      {/* Input row */}
      <XStack gap="$2" alignItems="center">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/mp4,video/webm"
          multiple
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />

        {/* Paperclip button */}
        <Button
          size="$4"
          icon={Paperclip}
          onPress={() => fileInputRef.current?.click()}
          theme="dark"
          chromeless
          disabled={isUploading}
        />

        <Input
          ref={inputRef}
          flex={1}
          placeholder="Type a message..."
          size="$4"
          value={inputText}
          onChangeText={handleInputChange}
          onSelectionChange={(e) => { selectionRef.current = e.nativeEvent.selection }}
          onSubmitEditing={handleSendClick}
          // @ts-expect-error web-only
          onPaste={handlePaste}
          disabled={isUploading}
        />
        <EmojiPicker onSelect={handleEmojiSelect} />
        <Button
          size="$4"
          icon={Send}
          onPress={handleSendClick}
          disabled={!canSend}
          theme="dark"
        />
      </XStack>
    </YStack>
  )
}
