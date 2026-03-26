import {Paragraph, Sheet, Text, XStack, YStack} from '@my/ui'

export function SettingsSheet({
                                  showSettings,
                                  setShowSettings,
                                  identity,
                                  appVersion,
                              }) {
    return (
        <Sheet
            open={showSettings}
            onOpenChange={setShowSettings}
            modal
            dismissOnSnapToBottom
            snapPoints={[35]}
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
                </YStack>
            </Sheet.Frame>
            <Sheet.Overlay/>
        </Sheet>
    )
}
