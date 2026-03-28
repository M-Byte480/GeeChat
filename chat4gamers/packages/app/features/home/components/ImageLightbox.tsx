import { Button, ScrollView, Sheet, XStack, YStack } from '@my/ui'
import { X } from '@tamagui/lucide-icons'
import { API_BASE } from 'app/constants/config'

type Props = {
  url: string | null
  onClose: () => void
}

export function ImageLightbox({ url, onClose }: Props) {
  return (
    <Sheet
      open={!!url}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      modal
      dismissOnSnapToBottom
      snapPoints={[92]}
    >
      <Sheet.Frame padding={0}>
        <XStack px="$3" pt="$3" justifyContent="flex-end">
          <Button size="$2" chromeless icon={X} onPress={onClose} />
        </XStack>
        <ScrollView>
          <YStack p="$3" alignItems="center">
            {url && (
              <img
                src={`${API_BASE}/proxy-image?url=${encodeURIComponent(url)}`}
                style={{
                  width: '100%',
                  objectFit: 'contain',
                  borderRadius: 8,
                  cursor: 'zoom-out',
                }}
                onClick={onClose}
              />
            )}
          </YStack>
        </ScrollView>
      </Sheet.Frame>
      <Sheet.Overlay />
    </Sheet>
  )
}
