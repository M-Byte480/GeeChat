import { useState, useEffect, useRef, useCallback } from 'react'
import { signMessage } from '../identity/crypto'
import type { Identity } from '../identity/types'
import { apiFetch } from '@my/api-client'
import type { Message } from '../types/types'
import { fireDesktopNotification } from '../utils/Notification'

function deriveWsBase(url: string): string {
  return url.replace(/^https:\/\//, 'wss://').replace(/^http:\/\//, 'ws://')
}

type Params = {
  channelId: string
  identity: Identity
  serverUrl: string
  socketRef: React.MutableRefObject<WebSocket | null>
}

export function useMessages({ channelId, identity, serverUrl, socketRef }: Params) {
  const apiBase = serverUrl
  const wsBase = deriveWsBase(serverUrl)
  const [messages, setMessages] = useState<Message[]>([])
  const [typingUser, setTypingUser] = useState<string | null>(null)
  const [errorBanner, setErrorBanner] = useState<string | null>(null)
  const errorTimerRef = useRef<NodeJS.Timeout | null>(null)

  const showError = useCallback((msg: string) => {
    setErrorBanner(msg)
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current)
    errorTimerRef.current = setTimeout(() => setErrorBanner(null), 5000)
  }, [])

  useEffect(() => {
    setMessages([])
  }, [channelId])

  useEffect(() => {
    apiFetch(apiBase, `/chat-history?channel=${channelId}`)
      .then(res => {
        if (!res.ok) throw new Error('Server error')
        return res.json()
      })
      .then(data => { if (Array.isArray(data)) setMessages(data) })
      .catch(() => showError('Could not load message history. Is the server running?'))

    const ws = new WebSocket(`${wsBase}/ws`)
    socketRef.current = ws

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data)

      if (msg.type === 'NEW_MESSAGE' && msg.channelId === channelId) {
        const isMentioned = msg.content?.includes(`@${identity.publicKey}`)
        if (isMentioned && document.visibilityState === 'hidden') {
          fireDesktopNotification({
            title: `${msg.senderName} mentioned you`,
            body: msg.content,
            serverUrl,
          })
        }

        setMessages(prev => {
          const optimisticIndex = prev.findIndex(m =>
            m.id === msg.tempId // exact match, no timestamp needed
          )

          if (optimisticIndex !== -1) {
            const updated = [...prev]
            updated[optimisticIndex] = msg
            return updated
          }

          if (optimisticIndex !== -1) {
            const updated = [...prev]
            updated[optimisticIndex] = msg
            return updated
          }

          return [...prev, msg]
        })
      }

      if (msg.type === 'TYPING' && msg.username !== identity.username) {
        setTypingUser(msg.username)
        setTimeout(() => setTypingUser(null), 2500)
      }
    }

    ws.onerror = () => showError('Connection lost. Reconnect by switching channels.')
    return () => ws.close()
  }, [channelId, identity.username, showError, apiBase, wsBase])

  const sendMessage = useCallback(async (text: string) => {
    const timestamp = new Date().toISOString()
    const tempId = Date.now()

    setMessages(prev => [...prev, {
      id: tempId,
      content: text,
      roomId: channelId,
      senderId: identity.publicKey,
      senderName: identity.username,
      timestamp,
    }])

    try {
      const signature = await signMessage(identity.privateKeyBytes, text, channelId, timestamp)
      await apiFetch(apiBase, `/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: channelId,
          content: text,
          userId: identity.publicKey,
          senderName: identity.username,
          signature,
          timestamp,
          tempId,
        }),
      })
    } catch {
      showError('Failed to send message. Check your connection.')
      setMessages(prev => prev.filter(m => m.id !== tempId))
    }
  }, [channelId, identity, apiBase, showError])

  return {
    messages,
    typingUser,
    errorBanner,
    setErrorBanner,
    sendMessage,
  }
}