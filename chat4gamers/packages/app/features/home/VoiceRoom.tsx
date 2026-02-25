// import { useState } from 'react'
// import { Button, YStack, Text, XStack } from '@my/ui'
// import { Mic, MicOff, PhoneOff } from 'lucide-react'
// import { LiveKitRoom, RoomAudioRenderer, ControlBar, useTrackToggle } from '@livekit/components-react'
// import { Track } from 'livekit-client'
//
// export const VoiceRoom = () => {
//   const [token, setToken] = useState<string | null>(null)
//
//   const handleJoin = async () => {
//     const resp = await fetch('http://89.167.67.187:4000/get-voice-token?room=main-room')
//     const { token } = await resp.json()
//     setToken(token)
//   }
//
//   if (!token) {
//     return (
//       <Button theme="green" onPress={handleJoin} icon={Mic}>Join Room</Button>
//     )
//   }
//
//   return (
//     <LiveKitRoom
//       serverUrl="ws://89.167.67.187:7880"
//       token={token}
//       connect={true}
//       audio={true}
//       onDisconnected={() => setToken(null)}
//     >
//       <YStack p="$4" backgroundColor="$gray2">
//         <XStack justifyContent="space-between">
//           <Text fontWeight="bold" color="$green10">• Connected</Text>
//         </XStack>
//
//         <XStack gap="$2" mt="$3">
//           {/* This component automatically plays your friends' voices */}
//           <RoomAudioRenderer />
//
//           {/* Default LiveKit buttons for Mute/Leave */}
//           <ControlBar variation="minimal" />
//         </XStack>
//       </YStack>
//     </LiveKitRoom>
//   )
// }

import {useEffect, useState} from 'react'
import { Button, YStack, Text, XStack } from '@my/ui'
import {Room, RoomEvent, Track} from 'livekit-client'
import { Mic, MicOff, PhoneOff, TestTube } from 'lucide-react'
import { LiveKitRoom, RoomAudioRenderer, ControlBar } from '@livekit/components-react';
import {API_BASE, LIVEKIT_WS} from "app/constants/config";

export const VoiceRoom = () => {
  const [room, setRoom] = useState<Room | null>(null)
  const [isJoined, setIsJoined] = useState(false)
  const [isMicEnabled, setIsMicEnabled] = useState(true)
  const [testMic, setTestMic] = useState(false)
  const [micAudioElement, setMicAudioElement] = useState<HTMLAudioElement | null>(null)

  // useEffect(() => {
  //   // Disconnect when the component unmounts (or app closes)
  //   return () => {
  //     room?.disconnect()
  //   }
  // }, [room])

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

  // const joinRoom = async () => {
  //   try {
  //     // 1. Get the token from your private Node server
  //     const resp = await fetch('http://89.167.67.187:4000/get-voice-token?room=main-room')
  //     const { token } = await resp.json()
  //
  //     // 2. Connect to the LiveKit instance
  //     const newRoom = new Room({
  //       adaptiveStream: true,
  //       // Removed the broken audioPreset line.
  //       // LiveKit handles audio optimization automatically.
  //     })
  //
  //     // packages/app/features/home/VoiceRoom.tsx
  //     await newRoom.connect('ws://89.167.67.187:7880', token)
  //     // await newRoom.connect('ws://localhost:7800', token)
  //
  //     // FIX: Changed enableAudio() to setMicrophoneEnabled(true)
  //     await newRoom.localParticipant.setMicrophoneEnabled(true)
  //
  //     setRoom(newRoom)
  //     setIsJoined(true)
  //   } catch (error) {
  //     console.error('Failed to join voice room:', error)
  //   }
  // }

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