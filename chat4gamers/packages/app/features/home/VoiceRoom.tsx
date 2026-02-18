import {useEffect, useState} from 'react'
import { Button, YStack, Text, XStack } from '@my/ui'
import { Room, Track } from 'livekit-client'
import { Mic, MicOff, PhoneOff, TestTube } from 'lucide-react'

export const VoiceRoom = () => {
  const [room, setRoom] = useState<Room | null>(null)
  const [isJoined, setIsJoined] = useState(false)
  const [isMicEnabled, setIsMicEnabled] = useState(true)
  const [testMic, setTestMic] = useState(false)
  const [micAudioElement, setMicAudioElement] = useState<HTMLAudioElement | null>(null)

  useEffect(() => {
    // Disconnect when the component unmounts (or app closes)
    return () => {
      room?.disconnect()
    }
  }, [room])

  const joinRoom = async () => {
    try {
      // 1. Get the token from your private Node server
      const resp = await fetch('https://REDACTED_USERNAME.ie:4000/get-voice-token?room=my-room')
      const { token } = await resp.json()

      // 2. Connect to the LiveKit instance
      const newRoom = new Room({
        adaptiveStream: true,
        // Removed the broken audioPreset line.
        // LiveKit handles audio optimization automatically.
      })

      // packages/app/features/home/VoiceRoom.tsx
      await newRoom.connect('ws://REDACTED_USERNAME.ie:7880', token)
      // await newRoom.connect('ws://localhost:7800', token)

      // FIX: Changed enableAudio() to setMicrophoneEnabled(true)
      await newRoom.localParticipant.setMicrophoneEnabled(true)
      setIsJoined(true)

      setRoom(newRoom)
      setIsJoined(true)
    } catch (error) {
      console.error('Failed to join voice room:', error)
    }
  }

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

      <XStack gap="$2" mt="$3">
        {!isJoined ? (
          <Button theme="green" onPress={joinRoom} icon={Mic}>
            Join Room
          </Button>
        ) : (
          <>
            {/* Mute/Unmute Toggle */}
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