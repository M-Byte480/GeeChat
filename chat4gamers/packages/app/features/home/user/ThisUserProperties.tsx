import {XStack, YStack, Text} from "@my/ui";
import {VoiceRoom} from "app/features/home/VoiceRoom";
import {UserMockItem} from "app/features/home/user/UserMockItem";

export function ThisUserProperties({
                                     connectedVoiceChannelId,
                                     nickname,
                                     onParticipantsChange,
                                     onVoiceDisconnect
                                   }: {
  connectedVoiceChannelId: string | null;
  nickname: string;
  onParticipantsChange: (channelId: string, participants: string[]) => void;
  onVoiceDisconnect: () => void;
}) {

  return (
    <YStack borderWidth={1} borderColor="black" f={1}>
      <XStack>
        <Text>
          Game: <Text fontWeight="bold">Valorant</Text>
        </Text>
      </XStack>

      <XStack>
        {connectedVoiceChannelId && (
          <VoiceRoom
            channelId={connectedVoiceChannelId}
            nickname={nickname}
            onParticipantsChange={onParticipantsChange}
            onDisconnect={onVoiceDisconnect}
          />
        )}
        <Text>Actions</Text>

      </XStack>



      <XStack>
        <UserMockItem />
      </XStack>
    </YStack>
    )
}