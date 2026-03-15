import { useEffect } from 'react'
import { useAppStore } from 'app/features/home/hooks/useAppStore'

function deriveWsBase(url: string): string {
  return url.replace(/^https:\/\//, 'wss://').replace(/^http:\/\//, 'ws://')
}

export function useChannelsController(serverUrl: string | null) {
  const setChannels = useAppStore(s => s.setChannels)

  useEffect(() => {
    if (!serverUrl) return
    fetch(`${serverUrl}/channels`)
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setChannels(serverUrl, data) })
      .catch(() => {})
  }, [serverUrl, setChannels])

  useEffect(() => {
    if (!serverUrl) return
    const ws = new WebSocket(deriveWsBase(serverUrl) + '/ws')
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data)
      if (msg.type === 'CHANNEL_CREATED') {
        fetch(`${serverUrl}/channels`)
          .then(r => r.json())
          .then(data => { if (Array.isArray(data)) setChannels(serverUrl, data) })
          .catch(() => {})
      }
    }
    return () => ws.close()
  }, [serverUrl, setChannels])
}
