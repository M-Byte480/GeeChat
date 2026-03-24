import { useState, useRef, useCallback } from 'react'
import type { Identity } from '../identity/types'

type Params = {
  channelId: string
  identity: Identity
  serverUrl: string
  onSend: (text: string) => Promise<void>
}

export function useChatInput({ channelId, identity, onSend }: Params) {
  const [inputText, setInputText] = useState('')
  const [mentionQuery, setMentionQuery] = useState<string | null>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const socketRef = useRef<WebSocket | null>(null)

  const handleInputChange = useCallback(
    (text: string) => {
      setInputText(text)
      const match = text.match(/@(\w*)$/)
      setMentionQuery(match ? match[1] : null)

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
    },
    [channelId, identity.username]
  )

  const handleSend = useCallback(async () => {
    const text = inputText.trim()
    if (!text) return
    setInputText('')
    setMentionQuery(null)
    await onSend(text)
  }, [inputText, onSend])

  const insertMention = useCallback((publicKey: string) => {
    setInputText((prev) => prev.replace(/@\w*$/, `@${publicKey} `))
    setMentionQuery(null)
  }, [])

  // Expose socketRef so useMessages can assign the WS instance to it
  return {
    inputText,
    setInputText,
    mentionQuery,
    setMentionQuery,
    handleInputChange,
    handleSend,
    insertMention,
    socketRef,
  }
}
