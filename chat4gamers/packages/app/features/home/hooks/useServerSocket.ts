import { useEffect, useRef } from 'react'
import { getConfig } from '@my/api-client'

function deriveWsBase(url: string): string {
  return url.replace(/^https:\/\//, 'wss://').replace(/^http:\/\//, 'ws://')
}

type MessageHandler = (msg: Record<string, unknown>) => void

// Module-level singletons — one WebSocket per server URL shared by all subscribers
const sockets = new Map<string, WebSocket>()
const listeners = new Map<string, Set<MessageHandler>>()

function getOrOpen(serverUrl: string): WebSocket {
  const existing = sockets.get(serverUrl)
  if (existing && existing.readyState <= 1) return existing // CONNECTING or OPEN

  const token = getConfig().getSessionToken(serverUrl)
  const ws = new WebSocket(deriveWsBase(serverUrl) + `/ws?token=${token}`)
  sockets.set(serverUrl, ws)

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data as string)
      listeners.get(serverUrl)?.forEach((fn) => fn(msg))
    } catch {
      // ignore JSON parse errors from malformed WebSocket messages
    }
  }
  ws.onclose = () => sockets.delete(serverUrl)

  return ws
}

/**
 * Subscribe to the shared WebSocket for a server.
 * All callers with the same serverUrl reuse one connection —
 * no duplicate connections when multiple hooks are active.
 *
 * @param socketRef  Optional ref to receive the WebSocket instance (for sending)
 */
export function useServerSocket(
  serverUrl: string | null,
  onMessage: MessageHandler,
  socketRef?: React.MutableRefObject<WebSocket | null>
) {
  // Stable ref so the subscription never needs to re-register when handler changes
  const handlerRef = useRef(onMessage)
  handlerRef.current = onMessage

  useEffect(() => {
    if (!serverUrl) return

    let subs = listeners.get(serverUrl)
    if (!subs) {
      subs = new Set()
      listeners.set(serverUrl, subs)
    }
    const stable: MessageHandler = (msg) => handlerRef.current(msg)
    subs.add(stable)

    const ws = getOrOpen(serverUrl)
    if (socketRef) socketRef.current = ws

    return () => {
      subs.delete(stable)
      // Close the socket only when the last subscriber unmounts
      if (subs.size === 0) {
        sockets.get(serverUrl)?.close()
        sockets.delete(serverUrl)
        listeners.delete(serverUrl)
      }
    }
    // Only depends on serverUrl — handler changes are handled via ref
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverUrl])
}
