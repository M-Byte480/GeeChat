import { Paragraph, Sheet, Text, XStack, YStack } from '@my/ui'
import { useAppStore } from 'app/features/home/hooks/useAppStore'
import { FONT_OPTIONS } from 'app/provider/NextTamaguiProvider'

export function SettingsSheet({
  showSettings,
  setShowSettings,
  identity,
  appVersion,
}) {
  const appFont = useAppStore((s) => s.appFont)
  const setAppFont = useAppStore((s) => s.setAppFont)

  return (
    <Sheet
      open={showSettings}
      onOpenChange={setShowSettings}
      modal
      dismissOnSnapToBottom
      snapPoints={[45]}
    >
      <Sheet.Frame p="$5" gap="$4">
        <Text fontWeight="700" fontSize="$6">
          Settings
        </Text>
        <YStack gap="$3">
          <XStack jc="space-between" ai="center">
            <Paragraph color="$color10">Version</Paragraph>
            <Text fontWeight="600">{appVersion || '—'}</Text>
          </XStack>
          <XStack jc="space-between" ai="center">
            <Paragraph color="$color10">Username</Paragraph>
            <Text fontWeight="600">{identity.username}</Text>
          </XStack>
          <XStack jc="space-between" ai="center">
            <Paragraph color="$color10">Public Key</Paragraph>
            <Text fontWeight="600" fontSize="$2" color="$color10">
              {identity.publicKey.slice(0, 16)}…
            </Text>
          </XStack>

          {/* Font picker */}
          <XStack jc="space-between" ai="center">
            <Paragraph color="$color10">Font</Paragraph>
            <XStack gap="$2" flexWrap="wrap" jc="flex-end">
              {FONT_OPTIONS.map((f) => (
                <Text
                  key={f.key}
                  onPress={() => setAppFont(f.key)}
                  fontSize="$3"
                  fontWeight={appFont === f.key ? '700' : '400'}
                  color={appFont === f.key ? '$color' : '$color10'}
                  textDecorationLine={appFont === f.key ? 'underline' : 'none'}
                  cursor="pointer"
                  style={{ fontFamily: f.stack } as any}
                >
                  {f.label}
                </Text>
              ))}
            </XStack>
          </XStack>
        </YStack>
      </Sheet.Frame>
      <Sheet.Overlay />
    </Sheet>
  )
}
