import { useCallback, useEffect, useRef, useState } from 'react'
import { signMessage } from '../identity/crypto'
import type { Identity } from '../identity/types'
import { apiFetch } from '@my/api-client'
import type { Message } from '../types/types'
import { fireDesktopNotification } from '../utils/Notification'
import { useAppStore } from 'app/features/home/hooks/useAppStore'
import { useServerSocket } from './useServerSocket'

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

  const cachedMessages = useAppStore((s) => {
    return s.messageCache[channelId]?.messages ?? EMPTY_MESSAGES
  })

  const [hasMoreHistory, setHasMoreHistory] = useState(true)
  const isFetchingOlderRef = useRef(false)

  // Derived-state pattern: when channelId changes, reset isLoading to true
  // synchronously during render (before paint) so the skeleton always shows
  // during the channel switch window. React discards + retries the render
  // with the new state — no extra useEffect needed.
  const [isLoading, setIsLoading] = useState(true)
  const [prevChannelId, setPrevChannelId] = useState(channelId)
  if (prevChannelId !== channelId) {
    setPrevChannelId(channelId)
    setIsLoading(true)
    setHasMoreHistory(true)
  }
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
  }, [channelId, showError, apiBase])

  useServerSocket(
    serverUrl,
    (msg) => {
      if (msg.type === 'NEW_MESSAGE' && msg.channelId === channelId) {
        const isMentioned = (msg.content as string)?.includes(
          `@${identity.publicKey}`
        )
        if (isMentioned && document.visibilityState !== 'visible') {
          fireDesktopNotification({
            title: `${msg.senderName} mentioned you`,
            body: msg.content as string,
            serverUrl,
          })
        }
        // Restore message type from messageType field (avoids WS event type collision)
        const incoming = { ...msg, type: (msg.messageType ?? 'text') } as unknown as Message
        const existing =
          useAppStore.getState().messageCache[channelId]?.messages ?? []
        const optimisticIndex = existing.findIndex(
          (m: Message) => m.id === msg.tempId
        )
        if (optimisticIndex !== -1) {
          useAppStore
            .getState()
            .updateMessage(channelId, msg.tempId as number, incoming)
        } else {
          useAppStore
            .getState()
            .appendMessage(channelId, incoming)
        }
      }
      if (msg.type === 'REACTION_UPDATED' && msg.channelId === channelId) {
        useAppStore.getState().updateMessageReaction(
          channelId,
          msg.messageId as number,
          msg.emoji as string,
          msg.userPublicKey as string,
          msg.action as 'add' | 'remove'
        )
      }
      if (msg.type === 'MESSAGE_DELETED' && msg.channelId === channelId) {
        useAppStore
          .getState()
          .patchMessage(channelId, msg.id as number, { deletedAt: new Date().toISOString() })
      }
      if (msg.type === 'TYPING' && msg.username !== identity.username) {
        setTypingUser(msg.username as string)
        setTimeout(() => setTypingUser(null), 2500)
      }
    },
    socketRef
  )

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

  const sendGif = useCallback(
    async (gif: {
      id: string
      altText: string
      gifUrl: string
      gifFullUrl: string
      gifWidth: number
      gifHeight: number
    }) => {
      const timestamp = new Date().toISOString()
      const tempId = Date.now()
      const content = gif.altText || 'GIF'

      useAppStore.getState().appendMessage(channelId, {
        id: tempId,
        content,
        type: 'gif',
        gifUrl: gif.gifUrl,
        gifFullUrl: gif.gifFullUrl,
        gifWidth: gif.gifWidth,
        gifHeight: gif.gifHeight,
        gifAltText: gif.altText,
        roomId: channelId,
        senderId: identity.publicKey,
        senderName: identity.username,
        timestamp,
      })

      try {
        const signature = await signMessage(
          identity.privateKeyBytes,
          content,
          channelId,
          timestamp
        )
        await apiFetch(apiBase, `/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roomId: channelId,
            content,
            type: 'gif',
            gifUrl: gif.gifUrl,
            gifFullUrl: gif.gifFullUrl,
            gifWidth: gif.gifWidth,
            gifHeight: gif.gifHeight,
            gifAltText: gif.altText,
            userId: identity.publicKey,
            senderName: identity.username,
            signature,
            timestamp,
            tempId,
          }),
        })
      } catch {
        showError('Failed to send GIF. Check your connection.')
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

  const fetchOlderMessages = useCallback(async () => {
    if (isFetchingOlderRef.current || !hasMoreHistory) return
    const cached =
      useAppStore.getState().messageCache[channelId]?.messages ?? []
    if (cached.length === 0) return
    isFetchingOlderRef.current = true
    try {
      const oldest = cached[0]
      const res = await apiFetch(
        apiBase,
        `/chat-history?channel=${channelId}&before=${encodeURIComponent(oldest.timestamp)}`
      )
      if (!res.ok) return
      const data: Message[] = await res.json()
      if (!Array.isArray(data) || data.length === 0) {
        setHasMoreHistory(false)
        return
      }
      const existingIds = new Set(cached.map((m: Message) => m.id))
      const newMessages = data.filter((m: Message) => !existingIds.has(m.id))
      if (newMessages.length === 0) {
        setHasMoreHistory(false)
        return
      }
      useAppStore
        .getState()
        .setChannelMessages(channelId, [...newMessages, ...cached])
    } finally {
      isFetchingOlderRef.current = false
    }
  }, [channelId, apiBase, hasMoreHistory])

  return {
    messages: cachedMessages,
    isLoading,
    typingUser,
    errorBanner,
    setErrorBanner,
    sendMessage,
    sendGif,
    fetchOlderMessages,
    hasMoreHistory,
  }
}
