import { memo, useState } from 'react'
import { XStack, Text } from '@my/ui'
import type { Reaction } from 'app/features/home/types/types'
import type { Identity } from 'app/features/home/identity/types'
import { useAppStore } from 'app/features/home/hooks/useAppStore'

interface Props {
  reactions: Reaction[]
  serverUrl: string
  identity: Identity
  onReact: (emoji: string) => void
}

function ReactionChip({
  reaction,
  isMine,
  onReact,
  serverUrl,
}: {
  reaction: Reaction
  isMine: boolean
  onReact: () => void
  serverUrl: string
}) {
  const [hovered, setHovered] = useState(false)
  const members = useAppStore((s) => s.members[serverUrl] ?? [])

  const names = reaction.users.map((pk) => {
    const m = members.find((mb) => mb.publicKey === pk)
    return m?.nickname ?? m?.username ?? pk.slice(0, 8) + '…'
  })

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={onReact}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '2px 8px',
          borderRadius: 12,
          border: isMine
            ? '1px solid rgba(88,101,242,0.8)'
            : '1px solid rgba(255,255,255,0.12)',
          background: isMine ? 'rgba(88,101,242,0.2)' : 'rgba(255,255,255,0.06)',
          cursor: 'pointer',
          fontSize: 14,
          color: 'inherit',
          transition: 'background 0.1s, border-color 0.1s',
        }}
        onMouseEnterCapture={undefined}
      >
        <span style={{ fontSize: 14, lineHeight: 1 }}>{reaction.emoji}</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: isMine ? '#818cf8' : '#9ca3af' }}>
          {reaction.count}
        </span>
      </button>

      {hovered && names.length > 0 && (
        <div
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 6px)',
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#111827',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 6,
            padding: '4px 8px',
            whiteSpace: 'nowrap',
            fontSize: 12,
            color: '#e5e7eb',
            zIndex: 9999,
            boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
            pointerEvents: 'none',
          }}
        >
          {names.join(', ')} reacted with {reaction.emoji}
        </div>
      )}
    </div>
  )
}

export const ReactionChips = memo(({ reactions, serverUrl, identity, onReact }: Props) => {
  if (!reactions || reactions.length === 0) return null

  return (
    <XStack flexWrap="wrap" gap="$1" mt="$1">
      {reactions.map((reaction) => (
        <ReactionChip
          key={reaction.emoji}
          reaction={reaction}
          isMine={reaction.users.includes(identity.publicKey)}
          onReact={() => onReact(reaction.emoji)}
          serverUrl={serverUrl}
        />
      ))}
    </XStack>
  )
})
