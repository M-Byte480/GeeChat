'use client'

import { useEffect, useRef, useState } from 'react'

type Quality = 'excellent' | 'good' | 'fair' | 'poor' | 'offline'

function latencyToQuality(ms: number | null): Quality {
  if (ms === null) return 'offline'
  if (ms < 80) return 'excellent'
  if (ms < 180) return 'good'
  if (ms < 350) return 'fair'
  return 'poor'
}

const QUALITY_COLOR: Record<Quality, string> = {
  excellent: '#3ba55d',
  good: '#7ec729',
  fair: '#faa61a',
  poor: '#ed4245',
  offline: '#72767d',
}

const QUALITY_BARS: Record<Quality, number> = {
  excellent: 4,
  good: 3,
  fair: 2,
  poor: 1,
  offline: 0,
}

const QUALITY_LABEL: Record<Quality, string> = {
  excellent: 'Excellent',
  good: 'Good',
  fair: 'Fair',
  poor: 'Poor',
  offline: 'Offline',
}

// ── Signal bar SVG ────────────────────────────────────────────────────────────

function SignalBars({ quality }: { quality: Quality }) {
  const color = QUALITY_COLOR[quality]
  const activeBars = QUALITY_BARS[quality]
  const dimColor = '#72767d'

  // 4 bars, increasing height: 4, 7, 10, 13px out of a 14px viewbox
  const bars = [
    { x: 0, height: 4, y: 10 },
    { x: 4, height: 7, y: 7 },
    { x: 8, height: 10, y: 4 },
    { x: 12, height: 13, y: 1 },
  ]

  return (
    <svg width="16" height="14" viewBox="0 0 16 14" fill="none">
      {bars.map((bar, i) => (
        <rect
          key={i}
          x={bar.x}
          y={bar.y}
          width={3}
          height={bar.height}
          rx={1}
          fill={i < activeBars ? color : dimColor}
          opacity={i < activeBars ? 1 : 0.35}
        />
      ))}
    </svg>
  )
}

// ── Hook ──────────────────────────────────────────────────────────────────────

function useServerLatency(serverUrl: string | null, intervalMs = 30_000) {
  const [latency, setLatency] = useState<number | null>(null)

  useEffect(() => {
    if (!serverUrl) {
      setLatency(null)
      return
    }

    let cancelled = false

    const ping = async (): Promise<number | null> => {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 5_000)
      const start = performance.now()
      try {
        await fetch(serverUrl, { signal: controller.signal, cache: 'no-store' })
        return Math.round(performance.now() - start)
      } catch {
        return null
      } finally {
        clearTimeout(timeout)
      }
    }

    const measure = async () => {
      const ms = await ping()
      if (!cancelled) setLatency(ms)
    }

    // Warm up the TCP connection first (discard result), then take an accurate reading
    const initialize = async () => {
      await ping()
      if (!cancelled) measure()
    }

    initialize()
    const interval = setInterval(measure, intervalMs)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [serverUrl, intervalMs])

  return latency
}

// ── Component ─────────────────────────────────────────────────────────────────

type Props = { serverUrl: string }

export function ServerLatencyBar({ serverUrl }: Props) {
  const latency = useServerLatency(serverUrl)
  const quality = latencyToQuality(latency)
  const [showTip, setShowTip] = useState(false)

  const tipText =
    latency !== null
      ? `${QUALITY_LABEL[quality]} · ${latency}ms`
      : 'Server unreachable'

  return (
    <div
      style={{ position: 'relative', display: 'flex', alignItems: 'center' }}
      onMouseEnter={() => setShowTip(true)}
      onMouseLeave={() => setShowTip(false)}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 32,
          height: 32,
          borderRadius: 6,
          cursor: 'default',
        }}
      >
        <SignalBars quality={quality} />
      </div>

      {showTip && (
        <div
          style={{
            position: 'absolute',
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginBottom: 6,
            background: 'var(--color1)',
            border: '1px solid var(--borderColor)',
            borderRadius: 6,
            padding: '4px 8px',
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--color)',
            whiteSpace: 'nowrap',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            pointerEvents: 'none',
            zIndex: 100,
          }}
        >
          {tipText}
        </div>
      )}
    </div>
  )
}
