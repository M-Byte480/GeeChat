import { useUser } from '../hooks/useUser'
import { Avatar, Text, XStack, YStack } from '@my/ui'
import { Message } from 'app/features/home/types/types'
import { MentionText } from 'app/features/home/text/MentionText'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Identity } from 'app/features/home/identity/types'
import type { MemberRole } from 'app/features/home/components/DropdownMenu'
import { ReactionEmojiPicker } from 'app/features/home/components/ReactionEmojiPicker'
import { ReactionChips } from 'app/features/home/components/ReactionChips'

interface Props {
  message: Message
  serverUrl: string
  identity: Identity
  showHeader: boolean
  isFirst: boolean
  currentRole: MemberRole | null
  onDelete: (messageId: number) => void
  onReact: (messageId: number, emoji: string) => void
  onLayout?: (event: unknown) => void
}

const AVATAR_INDENT = 58

const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6M14 11v6" />
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </svg>
)

const SmileIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M8 13s1.5 2 4 2 4-2 4-2" />
    <line x1="9" y1="9" x2="9.01" y2="9" />
    <line x1="15" y1="9" x2="15.01" y2="9" />
  </svg>
)

export const MessageRow = memo(
  ({ message, serverUrl, identity, showHeader, isFirst, currentRole, onDelete, onReact, onLayout }: Props) => {
    const user = useUser(
      showHeader ? serverUrl : null,
      message.senderId,
      showHeader ? identity : null
    )
    const [hovered, setHovered] = useState(false)
    const shiftRef = useRef(false)
    const [shiftHeld, setShiftHeld] = useState(false)
    const [pickerAnchor, setPickerAnchor] = useState<DOMRect | null>(null)
    const emojiButtonRef = useRef<HTMLButtonElement>(null)

    const canDelete = currentRole === 'admin' || currentRole === 'owner'

    useEffect(() => {
      if (!hovered || !canDelete) return
      const onKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Shift') { shiftRef.current = true; setShiftHeld(true) }
      }
      const onKeyUp = (e: KeyboardEvent) => {
        if (e.key === 'Shift') { shiftRef.current = false; setShiftHeld(false) }
      }
      window.addEventListener('keydown', onKeyDown)
      window.addEventListener('keyup', onKeyUp)
      return () => {
        window.removeEventListener('keydown', onKeyDown)
        window.removeEventListener('keyup', onKeyUp)
      }
    }, [hovered, canDelete])

    const handleMouseEnter = useCallback(() => setHovered(true), [])
    const handleMouseLeave = useCallback(() => {
      setHovered(false)
      shiftRef.current = false
      setShiftHeld(false)
    }, [])

    const openPicker = useCallback(() => {
      if (emojiButtonRef.current) {
        setPickerAnchor(emojiButtonRef.current.getBoundingClientRect())
      }
    }, [])

    const timeString = useMemo(
      () =>
        new Date(message.timestamp).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
      [message.timestamp]
    )

    const isDeleted = !!message.deletedAt
    const showShiftTrash = hovered && shiftHeld && canDelete && !isDeleted
    const showEmojiBtn = hovered && !shiftHeld && !isDeleted

    const actionButton = showShiftTrash ? (
      <button
        onClick={() => onDelete(message.id)}
        title="Delete message"
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: '#f87171',
          padding: '2px 4px',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <TrashIcon />
      </button>
    ) : showEmojiBtn ? (
      <button
        ref={emojiButtonRef}
        onClick={openPicker}
        title="Add reaction"
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: '#9ca3af',
          padding: '2px 4px',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <SmileIcon />
      </button>
    ) : null

    const rowStyle: React.CSSProperties = {
      backgroundColor: hovered ? 'rgba(255,255,255,0.04)' : 'transparent',
      borderRadius: 4,
      transition: 'background-color 0.1s ease',
      position: 'relative',
    }

    const reactions = message.reactions ?? []

    const chips = (
      <ReactionChips
        reactions={reactions}
        serverUrl={serverUrl}
        identity={identity}
        onReact={(emoji) => onReact(message.id, emoji)}
      />
    )

    const deletedContent = (
      <Text fontSize="$3" color="$gray9" fontStyle="italic" userSelect="none">
        This message was deleted.
      </Text>
    )

    if (!showHeader) {
      return (
        <XStack
          paddingLeft={AVATAR_INDENT}
          paddingRight="$4"
          paddingVertical="$0"
          alignItems="flex-start"
          onLayout={onLayout}
          // @ts-expect-error web-only
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          style={rowStyle}
        >
          <YStack flex={1}>
            {isDeleted ? deletedContent : (
              <MentionText content={message.content} serverUrl={serverUrl} identity={identity} />
            )}
            {chips}
          </YStack>
          <XStack alignItems="center" height={22}>
            {actionButton}
          </XStack>
          {pickerAnchor && (
            <ReactionEmojiPicker
              anchorRect={pickerAnchor}
              onSelect={(emoji) => onReact(message.id, emoji)}
              onClose={() => setPickerAnchor(null)}
            />
          )}
        </XStack>
      )
    }

    return (
      <XStack
        gap="$3"
        marginTop={isFirst ? '$1' : '$4'}
        paddingRight="$4"
        paddingVertical="$1"
        alignItems="flex-start"
        onLayout={onLayout}
        // @ts-expect-error web-only
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={rowStyle}
      >
        <Avatar circular size="$4" userSelect="none" alignSelf="flex-start">
          <Avatar.Image
            src={user?.avatarUrl || 'https://placehold.co/100x100'}
            draggable={false}
          />
          <Avatar.Fallback bc="$color8" />
        </Avatar>
        <YStack flex={1} minWidth={0} alignSelf="flex-start">
          <XStack gap="$2" alignItems="center">
            <Text fontWeight="bold" fontSize="$3" userSelect="text">
              {user?.nickname ?? user?.username ?? message.senderName}
            </Text>
            <Text fontSize="$1" color="$gray10" userSelect="none">
              {timeString}
            </Text>
          </XStack>
          {isDeleted ? deletedContent : (
            <MentionText content={message.content} serverUrl={serverUrl} identity={identity} />
          )}
          {chips}
        </YStack>
        <XStack alignItems="center" paddingTop="$1">
          {actionButton}
        </XStack>
        {pickerAnchor && (
          <ReactionEmojiPicker
            anchorRect={pickerAnchor}
            onSelect={(emoji) => onReact(message.id, emoji)}
            onClose={() => setPickerAnchor(null)}
          />
        )}
      </XStack>
    )
  }
)
