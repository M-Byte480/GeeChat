import {Text, XStack, YStack} from '@my/ui'
import {Volume2} from '@tamagui/lucide-icons'

type Props = {
    channelId: string
    participants: string[]
}

export function VoiceChannelView({channelId, participants}: Props) {
    return (
        <YStack
            flex={1}
            alignItems="center"
            justifyContent="center"
            gap="$6"
            p="$6"
        >
            <XStack gap="$2" alignItems="center">
                <Volume2 size={20} color="$color10"/>
                <Text fontSize="$6" color="$color10" fontWeight="600">
                    {channelId}
                </Text>
            </XStack>

            {participants.length === 0 ? (
                <Text color="$color10" fontSize="$3">
                    No one is here yet — join from the sidebar
                </Text>
            ) : (
                <XStack gap="$4" flexWrap="wrap" justifyContent="center">
                    {participants.map((name) => (
                        <YStack key={name} alignItems="center" gap="$2" width={80}>
                            <XStack
                                width={64}
                                height={64}
                                borderRadius="$10"
                                backgroundColor="$color5"
                                alignItems="center"
                                justifyContent="center"
                                borderWidth={2}
                                borderColor="$color6"
                            >
                                <Text fontSize="$7" color="$color" fontWeight="700">
                                    {name.charAt(0).toUpperCase()}
                                </Text>
                            </XStack>
                            <Text
                                fontSize="$2"
                                color="$color"
                                numberOfLines={1}
                                textAlign="center"
                            >
                                {name}
                            </Text>
                        </YStack>
                    ))}
                </XStack>
            )}
        </YStack>
    )
}
