import { Button, Sheet, XStack, YStack, Text } from '@my/ui'
import { X, ZoomIn, ZoomOut } from '@tamagui/lucide-icons'
import { useEffect, useRef, useState } from 'react'
import { API_BASE } from 'app/constants/config'

type Props = {
  url: string | null
  onClose: () => void
}

const MIN_SCALE = 0.25
const MAX_SCALE = 8
const SCROLL_SENSITIVITY = 0.0012

export function ImageLightbox({ url, onClose }: Props) {
  const [scale, setScale] = useState(1)
  const containerRef = useRef<HTMLDivElement>(null)

  // Reset zoom whenever a new image is opened
  useEffect(() => {
    if (url) setScale(1)
  }, [url])

  // Imperative wheel listener so we can call preventDefault (passive: false)
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const handler = (e: WheelEvent) => {
      if (!e.ctrlKey) return
      e.preventDefault()
      e.stopPropagation()
      setScale((prev) => {
        const next = prev * (1 - e.deltaY * SCROLL_SENSITIVITY)
        return Math.min(MAX_SCALE, Math.max(MIN_SCALE, next))
      })
    }
    el.addEventListener('wheel', handler, { passive: false })
    return () => el.removeEventListener('wheel', handler)
  }, [])

  const imgSrc =
    url && (url.startsWith('blob:') || url.startsWith('data:'))
      ? url
      : url
        ? `${API_BASE}/proxy-image?url=${encodeURIComponent(url)}`
        : null

  const zoomPct = Math.round(scale * 100)

  return (
    <Sheet
      open={!!url}
      onOpenChange={(open) => { if (!open) onClose() }}
      modal
      dismissOnSnapToBottom
      snapPoints={[92]}
    >
      <Sheet.Frame padding={0}>
        {/* Toolbar */}
        <XStack px="$3" pt="$3" justifyContent="space-between" alignItems="center">
          <XStack gap="$2" alignItems="center">
            <Button
              size="$2"
              chromeless
              icon={ZoomOut}
              onPress={() => setScale((s) => Math.max(MIN_SCALE, parseFloat((s - 0.25).toFixed(2))))}
            />
            <Text
              fontSize="$2"
              color="$gray10"
              // @ts-expect-error web-only
              style={{ cursor: 'pointer', userSelect: 'none', minWidth: 42, textAlign: 'center' }}
              onPress={() => setScale(1)}
              title="Click to reset zoom"
            >
              {zoomPct}%
            </Text>
            <Button
              size="$2"
              chromeless
              icon={ZoomIn}
              onPress={() => setScale((s) => Math.min(MAX_SCALE, parseFloat((s + 0.25).toFixed(2))))}
            />
            <Text fontSize="$1" color="$gray9" ml="$2">
              Ctrl + scroll to zoom
            </Text>
          </XStack>
          <Button size="$2" chromeless icon={X} onPress={onClose} />
        </XStack>

        {/* Image container — wheel events captured here */}
        <YStack
          flex={1}
          alignItems="center"
          justifyContent="center"
          overflow="hidden"
          // @ts-expect-error web-only
          ref={containerRef}
          style={{ cursor: scale > 1 ? 'grab' : 'zoom-out' }}
        >
          {imgSrc && (
            <img
              src={imgSrc}
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain',
                borderRadius: 8,
                transform: `scale(${scale})`,
                transformOrigin: 'center center',
                transition: 'transform 0.08s ease-out',
                userSelect: 'none',
                pointerEvents: scale === 1 ? 'auto' : 'none',
              }}
              onClick={scale === 1 ? onClose : undefined}
              draggable={false}
            />
          )}
        </YStack>
      </Sheet.Frame>
      <Sheet.Overlay />
    </Sheet>
  )
}
