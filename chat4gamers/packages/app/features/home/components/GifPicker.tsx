import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { apiFetch } from '@my/api-client'

export interface GifResult {
  id: string
  altText: string
  gifUrl: string
  gifFullUrl: string
  gifWidth: number
  gifHeight: number
}

interface Props {
  serverUrl: string
  anchorRect: DOMRect
  onSelect: (gif: GifResult) => void
  onClose: () => void
}

const PICKER_WIDTH = 340
const PICKER_HEIGHT = 400

type Tab = 'trending' | 'search'

// Inline SVG — avoids bundler/import issues with special chars in filename.
// "Powered By KLIPY Horizontal - Yellow & Black Logo"
const PoweredByKlipy = () => (
  <svg
    version="1.1"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 640 107.3"
    style={{ height: 22, width: 'auto', display: 'block' }}
    aria-label="Powered by Klipy"
  >
    <style>{`.kst0{opacity:0.4}.kst1{fill:#F7DC3C}.kst2{fill:#EE4523}`}</style>
    {/* KLIPY letters */}
    <g>
      <g>
        <g>
          <path d="M498.7,107.1h-16.5c-1.9,0-3.3-1.5-3.3-3.3V33.1c0-1.9,1.5-3.3,3.3-3.3h16.5c1.9,0,3.3,1.5,3.3,3.3v70.6C502.1,105.7,500.7,107.1,498.7,107.1z"/>
          <path d="M441.4,83.4V33.1c0-1.9-1.5-3.3-3.3-3.3h-16.5c-1.9,0-3.3,1.5-3.3,3.3v53.7v17c0,1.9,1.5,3.3,3.3,3.3h19.7h29.3c1.9,0,3.3-1.5,3.3-3.3V90.1c0-1.9-1.5-3.3-3.3-3.3h-25.9C442.9,86.7,441.4,85.4,441.4,83.4z"/>
          <path d="M539.2,29.8c-0.8,0-2.6,0-2.7,0h-8.2h-18.1c-1.9,0-3.3,1.5-3.3,3.3v70.6c0,1.9,1.5,3.3,3.3,3.3h16.5c1.9,0,3.3-1.5,3.3-3.3V84.3c0-0.6,0.6-1,1-0.8c8.3,2.4,19,2.6,28.4-6.6C579.4,56.9,560.7,29.8,539.2,29.8z M545,63.7c-8.8,6.3-18.6-3.5-12.3-12.3c0.2-0.3,0.5-0.6,0.8-0.8c8.8-6.3,18.6,3.5,12.3,12.3C545.5,63.2,545.2,63.5,545,63.7z"/>
          <path d="M639.1,42l-11.3-11.3c-1.3-1.3-3.3-1.3-4.7,0l-18.1,18.1c-0.5,0.5-1.4,0.5-1.8,0l-18.1-18.1c-1.3-1.3-3.3-1.3-4.7,0L569.3,42c-1.3,1.3-1.3,3.3,0,4.7l23.2,23.2c0.2,0.2,0.3,0.6,0.3,0.9v33.1c0,1.8,1.5,3.2,3.2,3.2h16.1c1.8,0,3.2-1.5,3.2-3.2v-33c0-0.3,0.1-0.7,0.3-0.9l23.2-23.2C640.3,45.4,640.3,43.3,639.1,42z"/>
        </g>
      </g>
      {/* "Powered by" text (semi-transparent) */}
      <g className="kst0">
        <path d="M23,54.1c2,2,3,4.7,3,8.1c0,2.3-0.5,4.4-1.4,6c-0.9,1.7-2.3,2.9-4,3.8c-1.7,0.8-3.6,1.4-5.8,1.4h-8v12.5H0V51.2h14.9C18.3,51.2,21,52.1,23,54.1z M14.1,67.2c1.5,0,2.6-0.5,3.5-1.4c0.9-0.8,1.4-2.1,1.4-3.6c0-1.7-0.5-2.9-1.4-3.7c-0.9-0.8-2.2-1.4-3.5-1.4H6.9v10.1L14.1,67.2L14.1,67.2z"/>
        <path d="M56.9,52.8c2.7,1.5,4.8,3.5,6.4,6.2s2.3,5.8,2.3,9.4s-0.8,6.8-2.3,9.4c-1.6,2.7-3.6,4.7-6.4,6.2c-2.8,1.4-5.7,2.2-9.3,2.2S41,85.5,38.3,84c-2.7-1.5-4.9-3.5-6.5-6.2c-1.6-2.7-2.3-5.8-2.3-9.4s0.8-6.8,2.3-9.4c1.6-2.7,3.6-4.7,6.5-6.2c2.7-1.5,5.8-2.2,9.3-2.2C51.1,50.6,54.2,51.4,56.9,52.8z M38,74.7c0.9,1.8,2.3,3.1,3.9,4.1c1.7,1,3.5,1.4,5.7,1.4c2.1,0,4.1-0.5,5.6-1.4c1.7-0.9,2.9-2.3,3.9-4.1c0.9-1.8,1.4-3.9,1.4-6.3s-0.5-4.5-1.4-6.3c-0.9-1.8-2.2-3.1-3.9-4.1c-1.7-0.9-3.5-1.4-5.6-1.4c-2.2,0-4.1,0.5-5.7,1.4c-1.7,0.9-2.9,2.3-3.9,4.1c-0.9,1.8-1.4,3.9-1.4,6.3S37.1,72.9,38,74.7z"/>
        <path d="M92.9,63.1l-7.5,22.6h-5.8L67.5,51.1H75l7.5,23.3l7.5-23.3h5.6l7.5,23.3l7.5-23.3h7.5l-12.1,34.7h-5.8L92.9,63.1z"/>
        <path d="M129.4,65h13.3v6h-13.3v8.7h15.3v6.1h-22.2V51.2h22.1v6h-15.3L129.4,65L129.4,65z"/>
        <path d="M150.5,51.2h14.7c3.3,0,6,1,8.1,2.9s3,4.7,3,8.1c0,2.4-0.5,4.4-1.5,6.1c-1,1.7-2.4,2.9-4.2,3.8l7.5,13.7h-7.8l-6.9-12.6h-0.6h-5.4v12.6h-6.9L150.5,51.2L150.5,51.2z M164.3,67.1c1.5,0,2.7-0.5,3.6-1.4c0.9-0.9,1.4-2.1,1.4-3.6c0-1.6-0.5-2.8-1.4-3.6c-0.9-0.8-2.1-1.4-3.6-1.4h-7v9.9L164.3,67.1L164.3,67.1z"/>
        <path d="M190,65h13.3v6H190v8.7h15.3v6.1h-22.2V51.2h22.1v6H190L190,65L190,65z"/>
        <path d="M234,53.1c2.6,1.4,4.7,3.4,6.1,6c1.5,2.6,2.3,5.6,2.3,9.3s-0.8,6.7-2.3,9.3c-1.5,2.6-3.5,4.6-6.1,6c-2.6,1.4-5.6,2.1-8.9,2.1H211V51.2h14.2C228.5,51.2,231.5,51.8,234,53.1z M225.3,79.9c3.2,0,5.6-1,7.5-2.9c1.9-2,2.8-4.8,2.8-8.4c0-3.7-0.9-6.6-2.8-8.4c-1.9-2-4.4-2.9-7.5-2.9h-7.4v22.8L225.3,79.9L225.3,79.9z"/>
        <path d="M281,53.6c2,1.7,2.9,4.1,2.9,7.2c0,1.6-0.3,2.9-0.8,4.1c-0.6,1.1-1.4,2.1-2.3,2.8c1.4,0.6,2.4,1.6,3.2,3c0.8,1.4,1.4,3.1,1.4,5.2c0,3.2-1,5.7-3,7.5s-4.7,2.6-8.1,2.6h-15.4V51.2h14.4C276.4,51.2,279,51.9,281,53.6z M272.8,65.1c1.2,0,2.3-0.3,3-0.9c0.7-0.6,1.1-1.7,1.1-2.9c0-1.4-0.4-2.3-1.2-3c-0.8-0.7-2-1-3.3-1h-6.7v7.8H272.8L272.8,65.1z M273.3,79.7c1.6,0,2.7-0.4,3.6-1.1c0.9-0.7,1.4-1.8,1.4-3.2c0-1.5-0.5-2.6-1.4-3.2c-0.8-0.7-2-1.1-3.5-1.1h-7.8v8.7L273.3,79.7L273.3,79.7z"/>
        <path d="M300.4,85.7V72.3L287.2,51h8l8.6,14.5l8.7-14.4h8l-13.1,21.3v13.4L300.4,85.7L300.4,85.7z"/>
      </g>
      {/* Klipy K logo mark */}
      <g>
        <g>
          <g>
            <path className="kst1" d="M407.6,104.3L385,69.4c-0.4-0.7-0.4-1.4,0-2l21.2-34.9c0.8-1.3-0.1-3-1.7-3l-13.4,3c-10.6,2.4-13.8,8.6-20.2,17.5c-1.2,1.7-2,2.9-2,2.9c-1,1.8-3.7,1.1-3.7-1V23.2c-8.1,0-12.4,3-15.6,5.7c-10.2,8.4-12.4,18.8-12.4,32v44.4c0,1.1,0.9,2,2,2h24.2c1.1,0,2-0.9,2-2V83.2c0-2,2.6-2.7,3.6-1l8.2,24.2c0.4,0.7,1,1,1.7,1h27.2C407.5,107.2,408.5,105.5,407.6,104.3z M359.7,33.4c-1.5,0-2.7-1.2-2.7-2.7s1.2-2.7,2.7-2.7c1.5,0,2.7,1.2,2.7,2.7C362.3,32.3,361.2,33.4,359.7,33.4z"/>
          </g>
        </g>
        <path className="kst2" d="M333.8,48.8c0.2,0.6,2.1-29.7,31.7-30c0,0-24-28.2-32.9-15.6c0,0-4.4,6.9,4.1,9.1c0,0-13.7,3.6-13.5,13.1c0.1,3,3.1,4.9,5.9,3.7c1.6-0.7,3.6-2,6.2-4.4C335.3,24.6,329.3,36.7,333.8,48.8z"/>
      </g>
      <path className="kst2" d="M368.5,24.4v7.4c0,0.6,0.6,0.9,1,0.6l7.1-4.7l-7.1-3.8C369,23.6,368.5,23.9,368.5,24.4z"/>
    </g>
  </svg>
)

export function GifPicker({ serverUrl, anchorRect, onSelect, onClose }: Props) {
  const [tab, setTab] = useState<Tab>('trending')
  const [query, setQuery] = useState('')
  const [gifs, setGifs] = useState<GifResult[]>([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Position above anchor
  const top = Math.max(8, anchorRect.top - PICKER_HEIGHT - 8)
  const left = Math.min(
    window.innerWidth - PICKER_WIDTH - 8,
    Math.max(8, anchorRect.left - PICKER_WIDTH / 2 + anchorRect.width / 2)
  )

  const fetchGifs = useCallback(
    async (mode: Tab, q: string, nextPage: number) => {
      const isInitial = nextPage === 1
      if (isInitial) setLoading(true)
      else setLoadingMore(true)
      try {
        let path: string
        if (mode === 'search' && q.trim()) {
          path = `/api/gifs/search?q=${encodeURIComponent(q)}&page=${nextPage}&per_page=20`
        } else {
          path = `/api/gifs/trending?page=${nextPage}&per_page=20`
        }
        const res = await apiFetch(serverUrl, path)
        if (!res.ok) return
        const data = await res.json() as { results: GifResult[]; hasMore: boolean }
        if (isInitial) {
          setGifs(data.results)
        } else {
          setGifs((prev) => [...prev, ...data.results])
        }
        setHasMore(data.hasMore)
        setPage(nextPage)
      } finally {
        if (isInitial) setLoading(false)
        else setLoadingMore(false)
      }
    },
    [serverUrl]
  )

  // Initial load — trending
  useEffect(() => {
    fetchGifs('trending', '', 1)
  }, [fetchGifs])

  const handleTabChange = useCallback(
    (t: Tab) => {
      setTab(t)
      setGifs([])
      setPage(1)
      if (t === 'trending') {
        fetchGifs('trending', '', 1)
      } else if (query.trim()) {
        fetchGifs('search', query, 1)
      }
    },
    [query, fetchGifs]
  )

  const handleSearch = useCallback(
    (q: string) => {
      setQuery(q)
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
      searchTimerRef.current = setTimeout(() => {
        setGifs([])
        setPage(1)
        if (q.trim()) {
          fetchGifs('search', q, 1)
        } else {
          fetchGifs('trending', '', 1)
        }
      }, 400)
    },
    [fetchGifs]
  )

  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      if (loadingMore || !hasMore) return
      const el = e.currentTarget
      if (el.scrollHeight - el.scrollTop - el.clientHeight < 80) {
        const mode = tab === 'search' && query.trim() ? 'search' : 'trending'
        fetchGifs(mode, query, page + 1)
      }
    },
    [loadingMore, hasMore, tab, query, page, fetchGifs]
  )

  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [onClose])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return createPortal(
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        top,
        left,
        width: PICKER_WIDTH,
        height: PICKER_HEIGHT,
        background: '#313439',
        borderRadius: 12,
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 9999,
        overflow: 'hidden',
      }}
    >
      {/* Header: search + tabs */}
      <div style={{ padding: '8px 8px 0' }}>
        <input
          autoFocus
          type="text"
          placeholder="Search KLIPY"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          style={{
            width: '100%',
            boxSizing: 'border-box',
            background: '#2b2d31',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 8,
            color: '#dbdee1',
            fontSize: 13,
            padding: '6px 10px',
            outline: 'none',
          }}
        />
        <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
          {(['trending', 'search'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => handleTabChange(t)}
              style={{
                flex: 1,
                background: tab === t ? '#5865f2' : 'transparent',
                border: 'none',
                borderRadius: 6,
                color: tab === t ? '#fff' : '#9ca3af',
                fontSize: 12,
                fontWeight: 600,
                padding: '4px 0',
                cursor: 'pointer',
                textTransform: 'capitalize',
              }}
            >
              {t === 'trending' ? 'Trending' : 'Search'}
            </button>
          ))}
        </div>
      </div>

      {/* GIF grid */}
      <div
        onScroll={handleScroll}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: 6,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gridAutoRows: 'min-content',
          gap: 4,
          alignContent: 'start',
        }}
      >
        {loading && (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', color: '#9ca3af', fontSize: 13, padding: 24 }}>
            Loading…
          </div>
        )}
        {!loading && gifs.length === 0 && (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', color: '#9ca3af', fontSize: 13, padding: 24 }}>
            {tab === 'search' && query.trim() ? 'No results.' : 'No GIFs available.'}
          </div>
        )}
        {gifs.map((gif) => (
          <button
            key={gif.id}
            onClick={() => { onSelect(gif); onClose() }}
            title={gif.altText}
            style={{
              background: '#2b2d31',
              border: 'none',
              borderRadius: 6,
              padding: 0,
              cursor: 'pointer',
              overflow: 'hidden',
              aspectRatio: `${gif.gifWidth} / ${gif.gifHeight}`,
              display: 'block',
              width: '100%',
            }}
          >
            <img
              src={gif.gifUrl}
              alt={gif.altText}
              loading="lazy"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          </button>
        ))}
        {loadingMore && (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', color: '#9ca3af', fontSize: 12, padding: 8 }}>
            Loading more…
          </div>
        )}
      </div>

      {/* Klipy branding */}
      <div style={{ padding: '4px 8px 6px', display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{
          borderRadius: 4,
          padding: '2px 8px',
          display: 'flex',
          alignItems: 'center',
        }}>
          <PoweredByKlipy />
        </div>
      </div>
    </div>,
    document.body
  )
}
