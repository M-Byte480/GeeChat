import { useCallback } from 'react'
import { XStack } from '@my/ui'
import { ThisUserProperties } from 'app/features/home/user/ThisUserProperties'
import { Identity } from 'app/features/home/identity'
import { useAppStore } from 'app/features/home/hooks/useAppStore'

interface Props {
  passedIdentity: Identity
}

export function UserPromptDialog({ passedIdentity }: Props) {
  const voiceConnection = useAppStore((s) => s.voiceConnection)
  const setVoiceConnection = useAppStore((s) => s.setVoiceConnection)
  const setVoiceParticipants = useAppStore((s) => s.setVoiceParticipants)

  // Stable: voiceConnection.serverUrl never changes mid-call (you can't switch
  // servers while in a call), so this callback is safe to use from VoiceRoom.
  const handleParticipantsChange = useCallback(
    (channelId: string, participants: string[]) => {
      const serverUrl = useAppStore.getState().voiceConnection?.serverUrl
      if (serverUrl) setVoiceParticipants(serverUrl, channelId, participants)
    },
    [setVoiceParticipants]
  )

  const handleVoiceDisconnect = useCallback(() => {
    setVoiceConnection(null)
  }, [setVoiceConnection])

  return (
    <XStack position="absolute" bottom={0} left={0}>
      <ThisUserProperties
        connectedVoiceChannelId={voiceConnection?.channelId ?? null}
        nickname={passedIdentity.username}
        serverUrl={voiceConnection?.serverUrl ?? null}
        onParticipantsChange={handleParticipantsChange}
        onVoiceDisconnect={handleVoiceDisconnect}
        passedIdentity={passedIdentity}
      />
    </XStack>
  )
}
