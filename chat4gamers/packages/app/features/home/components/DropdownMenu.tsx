import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { ReactNode } from 'react'

export type DropdownOption = {
  label: string
  icon?: ReactNode
  onPress: () => void
  destructive?: boolean
}

type Props = {
  options: DropdownOption[]
  /** Render prop — receives the open handler to attach to your trigger element */
  trigger: (open: () => void) => ReactNode
}

const MENU_WIDTH  = 200
const ITEM_HEIGHT = 36

export function DropdownMenu({ options, trigger }: Props) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
  const triggerRef = useRef<HTMLDivElement>(null)

  const open = useCallback(() => {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const x = Math.min(rect.left, window.innerWidth  - MENU_WIDTH - 4)
    const y = Math.min(rect.bottom + 4, window.innerHeight - options.length * ITEM_HEIGHT - 8)
    setPos({ x, y })
  }, [options.length])

  const close = useCallback(() => setPos(null), [])

  useEffect(() => {
    if (!pos) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    // Defer so the click that opened the menu doesn't immediately close it
    const timer = setTimeout(() => window.addEventListener('click', close), 0)
    window.addEventListener('keydown', onKey)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('click', close)
      window.removeEventListener('keydown', onKey)
    }
  }, [pos, close])

  const menu = pos && typeof document !== 'undefined' && createPortal(
    <div
      onClick={e => e.stopPropagation()}
      style={{
        position:     'fixed',
        top:          pos.y,
        left:         pos.x,
        zIndex:       9999,
        minWidth:     MENU_WIDTH,
        background:   'var(--color2, #1e1e1e)',
        border:       '1px solid var(--borderColor, #333)',
        borderRadius: 8,
        boxShadow:    '0 4px 20px rgba(0,0,0,0.4)',
        overflow:     'hidden',
        padding:      '4px 0',
      }}
    >
      {options.map((opt, i) => (
        <DropdownItem key={i} option={opt} onClose={close} />
      ))}
    </div>,
    document.body,
  )

  return (
    <>
      {/* @ts-ignore */}
      <div ref={triggerRef} style={{ display: 'block' }}>
        {trigger(open)}
      </div>
      {menu}
    </>
  )
}

function DropdownItem({ option, onClose }: { option: DropdownOption; onClose: () => void }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onClick={() => { option.onPress(); onClose() }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display:    'flex',
        alignItems: 'center',
        gap:        8,
        padding:    '0 14px',
        height:     ITEM_HEIGHT,
        cursor:     'pointer',
        fontSize:   13,
        color:      option.destructive ? 'var(--red10, #f44)' : 'var(--color, #eee)',
        background: hovered
          ? option.destructive ? 'var(--red4, #3a1010)' : 'var(--color4, #2a2a2a)'
          : 'transparent',
        userSelect: 'none',
      }}
    >
      {option.icon && (
        <span style={{ display: 'flex', alignItems: 'center', opacity: 0.8 }}>
          {option.icon}
        </span>
      )}
      {option.label}
    </div>
  )
}
