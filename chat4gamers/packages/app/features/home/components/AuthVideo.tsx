import { useEffect, useState } from 'react'
import { apiFetch } from '@my/api-client'

const blobCache = new Map<string, string>()

interface Props {
  src: string
  serverUrl: string
}

export function AuthVideo({ src, serverUrl }: Props) {
  const [blobUrl, setBlobUrl] = useState<string | null>(() => blobCache.get(src) ?? null)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (blobCache.has(src)) {
      setBlobUrl(blobCache.get(src)!)
      return
    }
    const path = src.startsWith(serverUrl) ? src.slice(serverUrl.length) : src
    let cancelled = false

    apiFetch(serverUrl, path)
      .then(async (res) => {
        if (!res.ok || !res.body) throw new Error('Failed to load video')

        // Stream the response so we can show download progress
        const contentLength = Number(res.headers.get('Content-Length') ?? 0)
        const reader = res.body.getReader()
        const chunks: Uint8Array[] = []
        let received = 0

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          if (cancelled) return
          chunks.push(value)
          received += value.length
          if (contentLength > 0) setProgress(Math.round((received / contentLength) * 100))
        }

        const blob = new Blob(chunks, { type: 'video/mp4' })
        const url = URL.createObjectURL(blob)
        blobCache.set(src, url)
        if (!cancelled) setBlobUrl(url)
      })
      .catch(() => {})

    return () => { cancelled = true }
  }, [src, serverUrl])

  if (!blobUrl) {
    return (
      <div style={{
        width: '100%',
        maxWidth: 480,
        height: 60,
        background: 'rgba(255,255,255,0.06)',
        borderRadius: 8,
        marginTop: 4,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        color: '#9ca3af',
        fontSize: 13,
      }}>
        <span>▶</span>
        <span>{progress > 0 ? `Loading video… ${progress}%` : 'Loading video…'}</span>
      </div>
    )
  }

  return (
    <video
      src={blobUrl}
      controls
      style={{
        maxWidth: '100%',
        maxHeight: 300,
        borderRadius: 8,
        marginTop: 4,
        display: 'block',
      }}
    />
  )
}
