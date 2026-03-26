import {Button, Text, XStack} from '@my/ui'
import {Pencil, Settings} from '@tamagui/lucide-icons'

export function TopScreenStatusBar({
                                       identity,
                                       setShowSettings,
                                       setShowEditUsername,
                                       setUsernameInput,
                                   }) {
    return (
        <XStack
            height={28}
            bg="$color1"
            borderBottomWidth={1}
            borderColor="$borderColor"
            alignItems="center"
            px="$3"
            // @ts-expect-error — Electron-specific CSS property
            style={{WebkitAppRegion: 'drag', userSelect: 'none'}}
        >
            <XStack
                gap="$2"
                alignItems="center"
                // @ts-expect-error — Electron-specific CSS property
                style={{WebkitAppRegion: 'no-drag'}}
            >
                <Button
                    size="$1"
                    chromeless
                    onPress={() => {
                        setUsernameInput(identity.username)
                        setShowEditUsername(true)
                    }}
                >
                    <XStack gap="$2" alignItems="center">
                        {identity.pfp && (
                            // @ts-expect-error — native img in web/Electron
                            <img
                                src={identity.pfp}
                                style={{
                                    width: 20,
                                    height: 20,
                                    borderRadius: '50%',
                                    objectFit: 'cover',
                                }}
                            />
                        )}
                        <Text fontSize="$2" color="$color11" fontWeight="600">
                            {identity.username}
                        </Text>
                        <Pencil size={10} color="$color10"/>
                    </XStack>
                </Button>
                <Button
                    size="$1"
                    chromeless
                    icon={Settings}
                    onPress={() => setShowSettings(true)}
                />
            </XStack>
        </XStack>
    )
}
