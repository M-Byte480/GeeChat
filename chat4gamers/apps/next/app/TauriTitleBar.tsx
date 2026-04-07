'use client'

import { useEffect, useState } from 'react'

// Tauri v2 injects this global into every webview
declare global {
  interface Window {
    __TAURI_INTERNALS__?: {
      invoke: (cmd: string, args?: Record<string, unknown>) => Promise<unknown>
      metadata: { currentWindow: { label: string } }
    }
  }
}

function tauriInvoke(cmd: string) {
  const t = window.__TAURI_INTERNALS__
  if (!t) return
  const label = t.metadata.currentWindow.label
  t.invoke(cmd, { label }).catch((e: unknown) => console.error(cmd, e))
}

export function TauriTitleBar() {
  const [isTauri, setIsTauri] = useState(false)
  const [isMac, setIsMac] = useState(false)

  useEffect(() => {
    setIsTauri(!!window.__TAURI_INTERNALS__)
    setIsMac(navigator.userAgent.includes('Mac OS'))
  }, [])

  if (!isTauri || isMac) return null

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        height: 28,
        display: 'flex',
        alignItems: 'stretch',
        zIndex: 2147483647,
      }}
    >
      <TitleBarButton
        onClick={() => tauriInvoke('plugin:window|minimize')}
        label="Minimize"
      >
        <svg width="10" height="1" viewBox="0 0 10 1">
          <rect width="10" height="1.5" fill="currentColor" />
        </svg>
      </TitleBarButton>

      <TitleBarButton
        onClick={() => tauriInvoke('plugin:window|toggle_maximize')}
        label="Maximize"
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <rect
            x="0.75"
            y="0.75"
            width="8.5"
            height="8.5"
            stroke="currentColor"
            strokeWidth="1.5"
          />
        </svg>
      </TitleBarButton>

      <TitleBarButton
        onClick={() => {
          console.log("WHY WONT IT WORK")
          tauriInvoke('plugin:window|close')
        }}
        label="Close"
        isClose
      >
        <svg width="10" height="10" viewBox="0 0 10 10">
          <path
            d="M1 1L9 9M9 1L1 9"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </TitleBarButton>
    </div>
  )
}

function TitleBarButton({
  onClick,
  label,
  isClose,
  children,
}: {
  onClick: () => void
  label: string
  isClose?: boolean
  children: React.ReactNode
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <button
      aria-label={label}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: 46,
        background: hovered ? (isClose ? '#c42b1c' : 'rgba(255,255,255,0.1)') : 'transparent',
        border: 'none',
        color: hovered ? '#fff' : '#999',
        cursor: 'default',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'background 0.1s, color 0.1s',
        padding: 0,
      }}
    >
      {children}
    </button>
  )
}
