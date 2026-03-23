import { createPortal } from 'react-dom'
import { useState, useRef, useCallback, useEffect, ReactNode } from 'react'

type Props = {
  trigger: (open: () => void) => ReactNode
  children: ReactNode
  width?: number
}

export function PopoverMenu({ trigger, children, width = 280 }: Props) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
  const triggerRef = useRef<HTMLDivElement>(null)

  const open = useCallback(() => {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    // Position to the left of the trigger, aligned to its top
    const x = rect.left - width - 8
    const y = Math.min(rect.top, window.innerHeight - 400)
    setPos({ x, y })
  }, [width])

  const close = useCallback(() => setPos(null), [])

  useEffect(() => {
    if (!pos) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
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
        width,
        background:   'var(--color2, #1e1e1e)',
        border:       '1px solid var(--borderColor, #333)',
        borderRadius: 8,
        boxShadow:    '0 4px 20px rgba(0,0,0,0.4)',
        overflow:     'hidden',
      }}
    >
      {children}
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