import {XStack} from "@my/ui";
import {ThisUserProperties} from "app/features/home/user/ThisUserProperties";
import {UserStatus} from "app/features/home/types/User";
import {Identity} from "app/features/home/identity";

interface Prompt {
  connectedVoiceChannelId: string | null;
  passedIdentity: Identity;
  activeServer: { url: string } | null;
  handleParticipantsChange: (channelId: string, participants: string[]) => void;
  handleVoiceDisconnect: () => void;
}

export function UserPromptDialog({
  connectedVoiceChannelId,
 passedIdentity,
  activeServer,
  handleParticipantsChange,
  handleVoiceDisconnect
}: Prompt){

  return (
    <XStack position="absolute" bottom={0} left={0}>
      <ThisUserProperties
        connectedVoiceChannelId={connectedVoiceChannelId}
        nickname={passedIdentity.username}
        user={{ username: passedIdentity.username, publicKey: passedIdentity.publicKey, status: UserStatus.ONLINE, avatarUrl: passedIdentity.pfp }}
        serverUrl={activeServer?.url ?? null}
        onParticipantsChange={handleParticipantsChange}
        onVoiceDisconnect={handleVoiceDisconnect}
        passedIdentity={passedIdentity}
      />
    </XStack>
  )
}