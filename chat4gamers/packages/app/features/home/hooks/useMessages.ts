import { useCallback, useEffect, useRef, useState } from 'react'
import { signMessage } from '../identity/crypto'
import type { Identity } from '../identity/types'
import { apiFetch, getConfig } from '@my/api-client'
import type { Message } from '../types/types'
import { fireDesktopNotification } from '../utils/Notification'
import { useAppStore } from 'app/features/home/hooks/useAppStore'

function deriveWsBase(url: string): string {
  return url.replace(/^https:\/\//, 'wss://').replace(/^http:\/\//, 'ws://')
}

const EMPTY_MESSAGES: Message[] = []

type Params = {
  channelId: string
  identity: Identity
  serverUrl: string
  socketRef: React.MutableRefObject<WebSocket | null>
}

export function useMessages({
  channelId,
  identity,
  serverUrl,
  socketRef,
}: Params) {
  const apiBase = serverUrl
  const wsBase = deriveWsBase(serverUrl)

  const cachedMessages = useAppStore((s) => {
    return s.messageCache[channelId]?.messages ?? EMPTY_MESSAGES
  })

  const [isLoading, setIsLoading] = useState(
    () =>
      (useAppStore.getState().messageCache[channelId]?.messages ?? [])
        .length === 0
  )
  const [typingUser, setTypingUser] = useState<string | null>(null)
  const [errorBanner, setErrorBanner] = useState<string | null>(null)
  const errorTimerRef = useRef<NodeJS.Timeout | null>(null)

  const showError = useCallback((msg: string) => {
    setErrorBanner(msg)
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current)
    errorTimerRef.current = setTimeout(() => setErrorBanner(null), 5000)
  }, [])

  useEffect(() => {
    const cached =
      useAppStore.getState().messageCache[channelId]?.messages ?? []
    const lastMessage = cached[cached.length - 1]
    const since = lastMessage
      ? `&since=${encodeURIComponent(lastMessage.timestamp)}`
      : ''

    if (cached.length > 0) {
      setIsLoading(false)
      // Background fetch — silent
      apiFetch(apiBase, `/chat-history?channel=${channelId}${since}`)
        .then((res) => (res.ok ? res.json() : []))
        .then((data: Message[]) => {
          if (!Array.isArray(data) || data.length === 0) return
          const existingIds = new Set(cached.map((m: Message) => m.id))
          const newMessages = data.filter(
            (m: Message) => !existingIds.has(m.id)
          )
          if (newMessages.length > 0) {
            useAppStore
              .getState()
              .setChannelMessages(channelId, [...cached, ...newMessages])
          }
        })
        .catch(() => {})
    } else {
      setIsLoading(true)
      // No cache — full blocking fetch
      apiFetch(apiBase, `/chat-history?channel=${channelId}`)
        .then((res) => {
          if (!res.ok) throw new Error('Server error')
          return res.json()
        })
        .then((data: Message[]) => {
          if (Array.isArray(data))
            useAppStore.getState().setChannelMessages(channelId, data)
        })
        .catch(() =>
          showError('Could not load message history. Is the server running?')
        )
        .finally(() => setIsLoading(false))
    }

    // WebSocket always runs regardless of cache
    const token = getConfig().getSessionToken(serverUrl)
    const ws = new WebSocket(`${wsBase}/ws?token=${token}`)
    socketRef.current = ws

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data)
      if (msg.type === 'NEW_MESSAGE' && msg.channelId === channelId) {
        const isMentioned = msg.content?.includes(`@${identity.publicKey}`)
        if (isMentioned && document.visibilityState !== 'visible') {
          fireDesktopNotification({
            title: `${msg.senderName} mentioned you`,
            body: msg.content,
            serverUrl,
          })
        }
        const existing =
          useAppStore.getState().messageCache[channelId]?.messages ?? []
        const optimisticIndex = existing.findIndex(
          (m: Message) => m.id === msg.tempId
        )
        if (optimisticIndex !== -1) {
          useAppStore.getState().updateMessage(channelId, msg.tempId, msg)
        } else {
          useAppStore.getState().appendMessage(channelId, msg)
        }
      }
      if (msg.type === 'TYPING' && msg.username !== identity.username) {
        setTypingUser(msg.username)
        setTimeout(() => setTypingUser(null), 2500)
      }
    }

    ws.onerror = () =>
      showError('Connection lost. Reconnect by switching channels.')
    return () => ws.close()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelId, identity.username, showError, apiBase, wsBase])

  const sendMessage = useCallback(
    async (text: string) => {
      const timestamp = new Date().toISOString()
      const tempId = Date.now()

      useAppStore.getState().appendMessage(channelId, {
        id: tempId,
        content: text,
        roomId: channelId,
        senderId: identity.publicKey,
        senderName: identity.username,
        timestamp,
      })

      try {
        const signature = await signMessage(
          identity.privateKeyBytes,
          text,
          channelId,
          timestamp
        )
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
        const current =
          useAppStore.getState().messageCache[channelId]?.messages ?? []
        useAppStore.getState().setChannelMessages(
          channelId,
          current.filter((m: Message) => m.id !== tempId)
        )
      }
    },
    [channelId, identity, apiBase, showError]
  )

  return {
    messages: cachedMessages,
    isLoading,
    typingUser,
    errorBanner,
    setErrorBanner,
    sendMessage,
  }
}
