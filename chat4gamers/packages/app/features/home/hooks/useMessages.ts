import { useState, useEffect, useRef, useCallback } from 'react'
import { signMessage } from '../identity/crypto'
import type { Identity } from '../identity/types'
import type { Message } from '../types'

function deriveWsBase(url: string): string {
  return url.replace(/^https:\/\//, 'wss://').replace(/^http:\/\//, 'ws://')
}

type Params = {
  channelId: string
  identity: Identity
  serverUrl: string
}

export function useMessages({ channelId, identity, serverUrl }: Params) {
  const apiBase = serverUrl
  const wsBase = deriveWsBase(serverUrl)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputText, setInputText] = useState('')
  const [typingUser, setTypingUser] = useState<string | null>(null)
  const [errorBanner, setErrorBanner] = useState<string | null>(null)

  const socketRef = useRef<WebSocket | null>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const errorTimerRef = useRef<NodeJS.Timeout | null>(null)

  const showError = useCallback((msg: string) => {
    setErrorBanner(msg)
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current)
    errorTimerRef.current = setTimeout(() => setErrorBanner(null), 5000)
  }, [])

  // Reset messages when switching channels
  useEffect(() => {
    setMessages([])
  }, [channelId])

  // Fetch history + open WebSocket
  useEffect(() => {
    fetch(`${apiBase}/chat-history?channel=${channelId}`)
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
        setMessages(prev => {
          const isDuplicate = prev.some(m =>
            m.id === msg.id || (m.id.toString().length > 10 && m.content === msg.content)
          )
          if (isDuplicate) {
            return prev.map(m =>
              (m.content === msg.content && m.id.toString().length > 10) ? msg : m
            )
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

  const sendMessage = async () => {
    if (!inputText.trim()) return

    const currentText = inputText
    const timestamp = new Date().toISOString()
    const tempId = Date.now()

    setMessages(prev => [...prev, {
      id: tempId,
      content: currentText,
      roomId: channelId,
      senderId: identity.publicKey,
      senderName: identity.username,
      timestamp,
    }])
    setInputText('')

    try {
      const signature = await signMessage(identity.privateKeyBytes, currentText, channelId, timestamp)
      await fetch(`${apiBase}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: channelId,
          content: currentText,
          userId: identity.publicKey,
          senderName: identity.username,
          signature,
          timestamp,
        }),
      })
    } catch {
      showError('Failed to send message. Check your connection.')
      setMessages(prev => prev.filter(m => m.id !== tempId))
    }
  }

  const handleInputChange = (text: string) => {
    setInputText(text)
    const ws = socketRef.current
    if (ws?.readyState === WebSocket.OPEN) {
      if (!typingTimeoutRef.current) {
        ws.send(JSON.stringify({ type: 'TYPING', username: identity.username, channelId }))
      }
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
      typingTimeoutRef.current = setTimeout(() => {
        typingTimeoutRef.current = null
      }, 2000)
    }
  }

  return {
    messages,
    inputText,
    typingUser,
    errorBanner,
    setErrorBanner,
    sendMessage,
    handleInputChange,
  }
}
