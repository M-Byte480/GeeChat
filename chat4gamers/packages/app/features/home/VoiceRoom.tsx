import {useEffect, useState} from 'react'
import { Button, YStack, Text, XStack } from '@my/ui'
import {Room, RoomEvent, Track} from 'livekit-client'
import { Mic, MicOff, PhoneOff, TestTube } from 'lucide-react'
import {API_BASE, LIVEKIT_WS} from "app/constants/config";

export const VoiceRoom = () => {
  const [room, setRoom] = useState<Room | null>(null)
  const [isJoined, setIsJoined] = useState(false)
  const [isMicEnabled, setIsMicEnabled] = useState(true)
  const [testMic, setTestMic] = useState(false)
  const [micAudioElement, setMicAudioElement] = useState<HTMLAudioElement | null>(null)

  useEffect(() => {
    if (!room) return

    room.on('trackSubscribed', (track) => {
      if (track.kind === Track.Kind.Audio) {
        const element = track.attach()
        document.body.appendChild(element)

        // FORCED START: Sometimes browsers pause attached audio
        element.play().catch(err => {
          console.warn("Autoplay blocked. User needs to click something.", err)
        })
      }
    })

    room.on('trackUnsubscribed', (track) => {
      track.detach().forEach((el) => el.remove())
    })

    // Check if we need to "resume" audio context
    room.on('audioPlaybackChanged', () => {
      if (!room.canPlaybackAudio) {
        // You could show a "Click to Unmute" button here if needed
        console.log("Audio playback is blocked by browser")
      }
    })
  }, [room])

  const joinRoom = async (targetRoom: string = 'hideout') => {
    try {
      const resp = await fetch(`${API_BASE}/get-voice-token?room=${targetRoom}`);
      const { token } = await resp.json();

      const newRoom = new Room({ adaptiveStream: true });


      newRoom.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
        if (track.kind === Track.Kind.Audio) {
          const element = track.attach();
        }
      });
      await newRoom.connect(LIVEKIT_WS, token, {
        autoSubscribe: true,
      });

      newRoom.remoteParticipants.forEach((participant) => {
        participant.trackPublications.forEach((publication) => {
          // If the track is already subscribed (autoSubscribe did its job)
          if (publication.track && publication.kind === Track.Kind.Audio) {
            publication.track.attach();
            console.log(`Attached existing audio for: ${participant.identity}`);
          }
        });
      });

      await newRoom.localParticipant.setMicrophoneEnabled(true);

      setRoom(newRoom);
      setIsJoined(true);

    } catch (error) {
      console.error(`Failed to join ${targetRoom}:`, error);
    }
  };

  const toggleMic = async () => {
    if (!room) return

    const newMicState = !isMicEnabled
    await room.localParticipant.setMicrophoneEnabled(newMicState)
    setIsMicEnabled(newMicState)
  }

  const onMicTest = () => {
    const nextTestState = !testMic
    setTestMic(nextTestState)

    if (nextTestState && room) {
      const localAudioTrack = room.localParticipant.getTrackPublication(Track.Source.Microphone)
      if (localAudioTrack?.audioTrack) {
        const element = localAudioTrack.audioTrack.attach()
        element.volume = 0.5
        document.body.appendChild(element)
        setMicAudioElement(element)
      }
    } else if (micAudioElement) {
      micAudioElement.remove()
      setMicAudioElement(null)
    }
  }

  const leaveRoom = async () => {
    if (room) {
      await room.disconnect()
      setRoom(null)
      setIsJoined(false)
      // Cleanup audio element if testing was on
      micAudioElement?.remove()
    }
  }

  return (
    <YStack p="$4" borderTopWidth={1} borderColor="$borderColor" backgroundColor="$gray2">
      <XStack justifyContent="space-between" alignItems="center">
        <Text fontWeight="bold" color={isJoined ? '$green10' : '$color10'}>
          {isJoined ? '• Voice Connected' : 'Voice Offline'}
        </Text>
      </XStack>

      <XStack gap="$2" $sm={{ gap: '$4' }} mt="$3" flexWrap="wrap" alignItems="center">
        {!isJoined ? (
          <Button theme="green" onPress={() => joinRoom('hideout')} icon={Mic}>
            Join Room
          </Button>
        ) : (
          <>
            {/* Mute/Unmute + Mic Test side by side */}
            <XStack gap="$2" alignItems="center">
              <Button
                theme={isMicEnabled ? 'blue' : 'red'}
                onPress={toggleMic}
                icon={isMicEnabled ? Mic : MicOff}
                circular
              />

              {/* Mic Test Toggle */}
              <Button
                chromeless={!testMic}
                theme={testMic ? 'yellow' : 'gray'}
                onPress={onMicTest}
                icon={TestTube}
              >
                {testMic ? "Hearing Self" : "Test Mic"}
              </Button>
            </XStack>

            {/* Leave Button */}
            <Button
              theme="red"
              variant="outlined"
              onPress={leaveRoom}
              icon={PhoneOff}
            >
              Leave
            </Button>
          </>
        )}
      </XStack>
    </YStack>
  )
}