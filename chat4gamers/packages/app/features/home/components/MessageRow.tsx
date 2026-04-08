import { useUser } from '../hooks/useUser'
import { Avatar, Text, XStack, YStack } from '@my/ui'
import { Message } from 'app/features/home/types/types'
import { MentionText } from 'app/features/home/text/MentionText'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Identity } from 'app/features/home/identity/types'
import type { MemberRole } from 'app/features/home/components/DropdownMenu'

interface Props {
  message: Message
  serverUrl: string
  identity: Identity
  /** When false (grouped message), skip avatar/username/useUser — much cheaper */
  showHeader: boolean
  /** True only for the very first message in the rendered list — suppresses top margin */
  isFirst: boolean
  currentRole: MemberRole | null
  onDelete: (messageId: number) => void
  onLayout?: (event: unknown) => void
}

const AVATAR_INDENT = 58

const TrashIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6M14 11v6" />
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </svg>
)

export const MessageRow = memo(
  ({ message, serverUrl, identity, showHeader, isFirst, currentRole, onDelete, onLayout }: Props) => {
    const user = useUser(
      showHeader ? serverUrl : null,
      message.senderId,
      showHeader ? identity : null
    )
    const [hovered, setHovered] = useState(false)
    const shiftRef = useRef(false)
    const [shiftHeld, setShiftHeld] = useState(false)

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

    const timeString = useMemo(
      () =>
        new Date(message.timestamp).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
      [message.timestamp]
    )

    const isDeleted = !!message.deletedAt
    const showTrash = hovered && shiftHeld && canDelete && !isDeleted

    const rowStyle = {
      backgroundColor: hovered ? 'rgba(255,255,255,0.04)' : 'transparent',
      borderRadius: 4,
      transition: 'background-color 0.1s ease',
      position: 'relative' as const,
    }

    const deletedContent = (
      <Text fontSize="$3" color="$gray9" fontStyle="italic" userSelect="none">
        This message was deleted.
      </Text>
    )

    const trashButton = showTrash ? (
      <XStack
        position="absolute"
        right={8}
        top="50%"
        // @ts-expect-error web-only style
        style={{ transform: 'translateY(-50%)', cursor: 'pointer', color: '#f87171' }}
        onPress={() => onDelete(message.id)}
        title="Delete message"
      >
        <TrashIcon />
      </XStack>
    ) : null

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
          <XStack flex={1}>
            {isDeleted ? deletedContent : (
              <MentionText
                content={message.content}
                serverUrl={serverUrl}
                identity={identity}
              />
            )}
          </XStack>
          {trashButton}
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
            <MentionText
              content={message.content}
              serverUrl={serverUrl}
              identity={identity}
            />
          )}
        </YStack>
        {trashButton}
      </XStack>
    )
  }
)
