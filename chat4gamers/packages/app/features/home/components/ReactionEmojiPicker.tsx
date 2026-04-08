import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

const EMOJIS = [
  '👍', '👎', '❤️', '😂', '😮', '😢', '😡', '🔥',
  '🎮', '🏆', '💯', '👀', '🎯', '🤔', '😎', '💪',
  '🤣', '😍', '👏', '💀', '🤝', '🙏', '⚡', '🤡',
]

interface Props {
  anchorRect: DOMRect
  onSelect: (emoji: string) => void
  onClose: () => void
}

const PICKER_WIDTH = 232
const PICKER_HEIGHT = 128

export function ReactionEmojiPicker({ anchorRect, onSelect, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    const t = setTimeout(() => document.addEventListener('mousedown', handler), 0)
    return () => { clearTimeout(t); document.removeEventListener('mousedown', handler) }
  }, [onClose])

  // Position above anchor, right-aligned
  let top = anchorRect.top - PICKER_HEIGHT - 6
  let left = anchorRect.right - PICKER_WIDTH
  if (top < 8) top = anchorRect.bottom + 6
  if (left < 8) left = 8
  if (left + PICKER_WIDTH > window.innerWidth - 8) left = window.innerWidth - PICKER_WIDTH - 8

  return createPortal(
    <div
      ref={ref}
      style={{
        position: 'fixed',
        top,
        left,
        zIndex: 9999,
        background: '#1a1a2e',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 8,
        padding: 8,
        display: 'grid',
        gridTemplateColumns: 'repeat(8, 1fr)',
        gap: 2,
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        width: PICKER_WIDTH,
      }}
    >
      {EMOJIS.map((emoji) => (
        <button
          key={emoji}
          onClick={() => { onSelect(emoji); onClose() }}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: 18,
            padding: '3px 2px',
            borderRadius: 4,
            lineHeight: 1,
          }}
          onMouseEnter={(e) => {
            ;(e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.12)'
          }}
          onMouseLeave={(e) => {
            ;(e.currentTarget as HTMLButtonElement).style.background = 'none'
          }}
        >
          {emoji}
        </button>
      ))}
    </div>,
    document.body
  )
}
