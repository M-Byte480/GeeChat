import { useEffect, useState } from 'react'
import { apiFetch } from '@my/api-client'

// Cache blob URLs so repeated renders of the same image don't re-fetch
const blobCache = new Map<string, string>()

interface Props {
  /** Full URL, e.g. http://localhost:4000/uploads/media/uuid.webp */
  src: string
  serverUrl: string
  style?: React.CSSProperties
  /** Called with the resolved blob URL so callers can open it in a lightbox without re-fetching */
  onClick?: (blobUrl: string) => void
  alt?: string
}

export function AuthImage({ src, serverUrl, style, onClick, alt = '' }: Props) {
  const [blobUrl, setBlobUrl] = useState<string | null>(() => blobCache.get(src) ?? null)

  useEffect(() => {
    if (blobCache.has(src)) {
      setBlobUrl(blobCache.get(src)!)
      return
    }
    // Extract the path relative to serverUrl
    const path = src.startsWith(serverUrl) ? src.slice(serverUrl.length) : src
    let cancelled = false
    apiFetch(serverUrl, path)
      .then((res) => {
        if (!res.ok) throw new Error('Not found')
        return res.blob()
      })
      .then((blob) => {
        if (cancelled) return
        const url = URL.createObjectURL(blob)
        blobCache.set(src, url)
        setBlobUrl(url)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [src, serverUrl])

  if (!blobUrl) {
    return (
      <div
        style={{
          width: 200,
          height: 80,
          background: 'rgba(255,255,255,0.06)',
          borderRadius: 8,
          marginTop: 4,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#6b7280',
          fontSize: 12,
        }}
      >
        Loading…
      </div>
    )
  }

  return (
    // eslint-disable-next-line jsx-a11y/alt-text
    <img
      src={blobUrl}
      alt={alt}
      style={{
        maxWidth: '100%',
        maxHeight: 300,
        borderRadius: 8,
        marginTop: 4,
        objectFit: 'contain',
        cursor: onClick ? 'zoom-in' : 'default',
        display: 'block',
        ...style,
      }}
      onClick={onClick ? () => onClick(blobUrl) : undefined}
    />
  )
}
