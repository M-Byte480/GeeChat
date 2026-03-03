import { XStack, YStack, Text, Separator } from "@my/ui";
import { VoiceRoom } from "app/features/home/VoiceRoom";
import { UserMockItem } from "app/features/home/user/UserMockItem";
import type { User } from "app/features/home/types/User";

export function ThisUserProperties({
                                     connectedVoiceChannelId,
                                     nickname,
                                     user,
                                     onParticipantsChange,
                                     onVoiceDisconnect
                                   }: {
  connectedVoiceChannelId: string | null;
  nickname: string | undefined;
  user: User;
  onParticipantsChange: (channelId: string, participants: string[]) => void;
  onVoiceDisconnect: () => void;
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
      {connectedVoiceChannelId && (
        <YStack bg="$backgroundHover" p="$2" borderRadius="$2">
          <Text fontSize="$1" fontWeight="800" color="$gray10" mb="$1">VOICE CONNECTED</Text>
          <VoiceRoom
            channelId={connectedVoiceChannelId}
            nickname={nickname}
            onParticipantsChange={onParticipantsChange}
            onDisconnect={onVoiceDisconnect}
          />
        </YStack>
      )}
      {/* 2. Body Section: Activity/Game */}
      <YStack p="$3" gap="$3">
        <YStack>
          <Text fontSize="$1" fontWeight="800" color="$gray10" textTransform="uppercase">
            Playing a Game
          </Text>
          <XStack alignItems="center" mt="$1">
            <Text fontWeight="bold" fontSize="$4">CS2</Text>
          </XStack>
        </YStack>

        <Separator />


        {/* 4. Footer Actions */}
        <YStack gap="$2" mt="$2">
          <Text fontSize="$1" fontWeight="800" color="$gray10" textTransform="uppercase">
            Actions
          </Text>
        </YStack>
      </YStack>
      <Separator />

      {/* 1. Profile Header Section */}
      <YStack bg="$color3" p="$3" gap="$2">
        <UserMockItem user={user} />
      </YStack>



    </YStack>
  );
}