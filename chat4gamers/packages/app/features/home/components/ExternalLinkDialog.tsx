import { Sheet, XStack, YStack, Text, Button } from '@my/ui'
import { ExternalLink } from '@tamagui/lucide-icons'

function openExternal(url: string) {
  const api = (window as any).electronAPI
  if (api?.openExternal) {
    api.openExternal(url)
  } else {
    window.open(url, '_blank', 'noopener,noreferrer')
  }
}

type Props = {
  url: string | null
  onClose: () => void
}

export function ExternalLinkDialog({ url, onClose }: Props) {
  return (
    <Sheet
      open={!!url}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      modal
      dismissOnSnapToBottom
      snapPoints={[32]}
    >
      <Sheet.Frame p="$5" gap="$4">
        <XStack gap="$2" alignItems="center">
          <ExternalLink size={18} color="$color10" />
          <Text fontWeight="700" fontSize="$5">
            Open external link?
          </Text>
        </XStack>
        <Text
          fontSize="$3"
          color="$color10"
          numberOfLines={2}
          // @ts-ignore
          style={{ wordBreak: 'break-all' }}
        >
          {url}
        </Text>
        <XStack gap="$3">
          <Button flex={1} size="$4" onPress={onClose}>
            Cancel
          </Button>
          <Button
            flex={1}
            size="$4"
            theme="active"
            onPress={() => {
              openExternal(url!)
              onClose()
            }}
          >
            Open
          </Button>
        </XStack>
      </Sheet.Frame>
      <Sheet.Overlay />
    </Sheet>
  )
}
