import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { ReactNode, MouseEvent } from 'react'

export type ContextMenuOption = {
  label: string
  icon?: ReactNode
  onPress: () => void
  destructive?: boolean
}

type Props = {
  options: ContextMenuOption[]
  children: ReactNode
}

type Pos = { x: number; y: number }

const MENU_WIDTH = 180
const ITEM_HEIGHT = 36

export function ContextMenu({ options, children }: Props) {
  const [pos, setPos] = useState<Pos | null>(null)

  const open = useCallback(
    (e: MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      // Clamp so the menu never overflows the viewport
      const x = Math.min(e.clientX, window.innerWidth - MENU_WIDTH)
      const y = Math.min(e.clientY, window.innerHeight - options.length * ITEM_HEIGHT - 8)
      setPos({ x, y })
    },
    [options.length]
  )

  const close = useCallback(() => setPos(null), [])

  useEffect(() => {
    if (!pos) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('click', close)
    window.addEventListener('contextmenu', close)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('click', close)
      window.removeEventListener('contextmenu', close)
      window.removeEventListener('keydown', onKey)
    }
  }, [pos, close])

  const menu =
    pos &&
    typeof document !== 'undefined' &&
    createPortal(
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'fixed',
          top: pos.y,
          left: pos.x,
          zIndex: 9999,
          minWidth: MENU_WIDTH,
          background: 'var(--color2, #1e1e1e)',
          border: '1px solid var(--borderColor, #333)',
          borderRadius: 8,
          boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
          overflow: 'hidden',
          padding: '4px',
        }}
      >
        {options.map((opt, i) => (
          <ContextMenuItem key={i} option={opt} onClose={close} />
        ))}
      </div>,
      document.body
    )

  return (
    <>
      {/* @ts-ignore — onContextMenu is valid on div in web/Electron */}
      <div onContextMenu={open} style={{ display: 'contents' }}>
        {children}
      </div>
      {menu}
    </>
  )
}

function ContextMenuItem({ option, onClose }: { option: ContextMenuOption; onClose: () => void }) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onClick={() => {
        option.onPress()
        onClose()
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '0 14px',
        height: ITEM_HEIGHT,
        cursor: 'pointer',
        fontSize: 13,
        fontFamily: 'Segeoe UI, sans-serif',
        color: option.destructive ? 'var(--red10, #f44)' : 'var(--color, #eee)',
        background: hovered
          ? option.destructive
            ? 'var(--red4, #3a1010)'
            : 'var(--color4, #2a2a2a)'
          : 'transparent',
        userSelect: 'none',
      }}
    >
      {option.icon && (
        <span style={{ display: 'flex', alignItems: 'center', opacity: 0.8 }}>{option.icon}</span>
      )}
      {option.label}
    </div>
  )
}
