import {Avatar, Separator, Text, XStack, YStack} from '@my/ui'
import {VoiceRoom} from 'app/features/home/VoiceRoom'
import {Identity} from 'app/features/home/identity'
import {StatusChip} from 'app/features/home/components/StatusChip'

export function ThisUserProperties({
                                       connectedVoiceChannelId,
                                       nickname,
                                       serverUrl,
                                       onParticipantsChange,
                                       onVoiceDisconnect,
                                       passedIdentity,
                                   }: {
    connectedVoiceChannelId: string | null
    nickname: string
    serverUrl: string | null
    onParticipantsChange: (channelId: string, participants: string[]) => void
    onVoiceDisconnect: () => void
    passedIdentity: Identity | null
}) {
    return (
        <YStack
            width={295}
            bg="$background"
            borderRadius="$4"
            overflow="hidden"
            elevation="$4"
            borderWidth={1}
            borderColor="$borderColor"
            mb={8}
            ml={8}
        >
            {/* 3. Voice Section */}
            {connectedVoiceChannelId && serverUrl && (
                <YStack bg="$backgroundHover" p="$2" borderRadius="$2">
                    <Text fontSize="$1" fontWeight="800" color="$gray10" mb="$1">
                        VOICE CONNECTED
                    </Text>
                    <VoiceRoom
                        channelId={connectedVoiceChannelId}
                        nickname={nickname}
                        serverUrl={serverUrl}
                        onParticipantsChange={onParticipantsChange}
                        onDisconnect={onVoiceDisconnect}
                    />
                </YStack>
            )}
            {/* 2. Body Section: Activity/Game */}
            <YStack p="$3" gap="$3">
                {/* TODO: game activity — disabled for now */}

                <Separator/>

                {/* 4. Footer Actions */}
                <YStack gap="$2" mt="$2">
                    <Text
                        fontSize="$1"
                        fontWeight="800"
                        color="$gray10"
                        textTransform="uppercase"
                    >
                        Actions
                    </Text>
                </YStack>
            </YStack>
            <Separator/>

            {/* 1. Profile Header Section */}
            <YStack bg="$color3" p="$3" gap="$2">
                <XStack alignItems="center" gap="$3" paddingVertical="$2">
                    <YStack width={40} height={40} position="relative">
                        <Avatar circular size="$4">
                            <Avatar.Image
                                src={passedIdentity?.pfp || 'https://placehold.co/100x100'}
                            />
                            <Avatar.Fallback bc="$color8"/>
                        </Avatar>
                        <XStack position="absolute" bottom={-5} right={-5} zIndex={10}>
                            <StatusChip status="online"/>
                        </XStack>
                    </YStack>
                    <YStack jc="center">
                        <Text fontWeight="600" color="$color" fontSize="$4">
                            {nickname ?? passedIdentity?.username}
                        </Text>
                    </YStack>
                </XStack>
            </YStack>
        </YStack>
    )
}
