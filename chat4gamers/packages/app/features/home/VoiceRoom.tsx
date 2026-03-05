import { useEffect, useState } from 'react'
import { Button, YStack, Text, XStack } from '@my/ui'
import { Room, RoomEvent, Track } from 'livekit-client'
import { Mic, MicOff, PhoneOff, TestTube, Volume2, VolumeX } from 'lucide-react'
// server URLs are passed as props — no hardcoded config needed
import { createLocalAudioTrack } from 'livekit-client'

type Props = {
  channelId: string
  nickname: string
  serverUrl: string
  onParticipantsChange: (channelId: string, participants: string[]) => void
  onDisconnect?: () => void
}

export const VoiceRoom = ({ channelId, nickname, serverUrl, onParticipantsChange, onDisconnect }: Props) => {
  const livekitWs = serverUrl.replace(/^https:\/\//, 'wss://').replace(/^http:\/\//, 'ws://')
  const [room, setRoom] = useState<Room | null>(null)

  const broadcastToServer = (ch: string, participants: string[]) => {
    fetch(`${serverUrl}/voice-state`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channelId: ch, participants }),
    }).catch(() => {})
  }
  const [isJoined, setIsJoined] = useState(false)
  const [isMicEnabled, setIsMicEnabled] = useState(true)
  const [isDeafened, setIsDeafened] = useState(false)
  const [testMic, setTestMic] = useState(false)
  const [micAudioElement, setMicAudioElement] = useState<HTMLAudioElement | null>(null)

  useEffect(() => {
    if (!room) return

    const getParticipants = () => [
      nickname,
      ...Array.from(room.remoteParticipants.values()).map(p => p.identity),
    ]

    const onParticipantEvent = () => {
      const participants = getParticipants()
      onParticipantsChange(channelId, participants)
      broadcastToServer(channelId, participants)
    }

    room.on(RoomEvent.ParticipantConnected, onParticipantEvent)
    room.on(RoomEvent.ParticipantDisconnected, onParticipantEvent)

    room.on(RoomEvent.TrackSubscribed, (track) => {
      if (track.kind === Track.Kind.Audio) {
        const el = track.attach()
        document.body.appendChild(el)
        el.play().catch(err => console.warn('Autoplay blocked:', err))
      }
    })

    room.on(RoomEvent.TrackUnsubscribed, (track) => {
      track.detach().forEach(el => el.remove())
    })

    room.on('audioPlaybackChanged', () => {
      if (!room.canPlaybackAudio) console.log('Audio playback blocked by browser')
    })

    return () => { room.removeAllListeners() }
  }, [room, channelId, nickname, onParticipantsChange])

  // Disconnect and clear when the selected voice channel changes while joined
  useEffect(() => {
    return () => {
      if (room) {
        room.disconnect()
        onParticipantsChange(channelId, [])
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelId])

  const joinRoom = async () => {
    try {
      const resp = await fetch(
        `${serverUrl}/get-voice-token?room=${channelId}&identity=${encodeURIComponent(nickname)}`
      )
      const { token } = await resp.json()

      const newRoom = new Room({ adaptiveStream: true })
      await newRoom.connect(livekitWs, token, { autoSubscribe: true })

      const audioTrack = await createLocalAudioTrack({
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      })

      // Since we're in Electron, we can't 'setProcessor' with a Native .node file
      // directly in the browser thread. Instead, we use your Rust binary
      // for the "Main" processing or via a Worklet if you went the WASM route.

      // For now, we've removed the Krisp bloat.
      // If you want to use your 'packages/audio-native', we'll call it here
      // or via the Electron IPC bridge.

      await newRoom.localParticipant.publishTrack(audioTrack, {
        name: 'microphone',
        // High-quality preset for gamers
        audioPreset: {
          maxBitrate: 48000
        }
      })

      // await newRoom.localParticipant.setMicrophoneEnabled(true)

      // Attach already-subscribed audio tracks
      newRoom.remoteParticipants.forEach(participant => {
        participant.trackPublications.forEach(pub => {
          if (pub.track && pub.kind === Track.Kind.Audio) {
            const el = pub.track.attach()
            document.body.appendChild(el)
            el.play().catch(() => {})
          }
        })
      })

      setRoom(newRoom)
      setIsJoined(true)

      // Initial participant list
      const remoteIds = Array.from(newRoom.remoteParticipants.values()).map(p => p.identity)
      const initialParticipants = [nickname, ...remoteIds]
      onParticipantsChange(channelId, initialParticipants)
      broadcastToServer(channelId, initialParticipants)
    } catch (err) {
      console.error(`Failed to join ${channelId}:`, err)
    }
  }

  const toggleMic = async () => {
    if (!room) return
    const next = !isMicEnabled
    await room.localParticipant.setMicrophoneEnabled(next)
    setIsMicEnabled(next)
  }

  const toggleDeafen = () => {
    if (!room) return
    const next = !isDeafened
    room.remoteParticipants.forEach(p => p.setVolume(next ? 0 : 1))
    setIsDeafened(next)
  }

  const onMicTest = () => {
    const next = !testMic
    setTestMic(next)
    if (next && room) {
      const pub = room.localParticipant.getTrackPublication(Track.Source.Microphone)
      if (pub?.audioTrack) {
        const el = pub.audioTrack.attach()
        el.volume = 0.5
        document.body.appendChild(el)
        setMicAudioElement(el)
      }
    } else if (micAudioElement) {
      micAudioElement.remove()
      setMicAudioElement(null)
    }
  }

  const leaveRoom = async () => {
    if (!room) return
    await room.disconnect()
    micAudioElement?.remove()
    setMicAudioElement(null)
    setRoom(null)
    setIsJoined(false)
    setIsMicEnabled(true)
    setIsDeafened(false)
    setTestMic(false)
    onParticipantsChange(channelId, [])
    broadcastToServer(channelId, [])
    onDisconnect?.()
  }

  return (
    <YStack p="$3" borderTopWidth={1} borderColor="$borderColor" bg="$color2" gap="$2">
      <Text fontSize="$2" fontWeight="600" color={isJoined ? '$green10' : '$color10'}>
        {isJoined ? `● Connected · #${channelId}` : `# ${channelId}`}
      </Text>

      <XStack gap="$2" flexWrap="wrap" alignItems="center">
        {!isJoined ? (
          <Button size="$3" theme="green" onPress={joinRoom} icon={Mic}>
            Join
          </Button>
        ) : (
          <>
            <Button
              size="$3"
              theme={isMicEnabled ? 'blue' : 'red'}
              onPress={toggleMic}
              icon={isMicEnabled ? Mic : MicOff}
              circular
            />
            <Button
              size="$3"
              theme={isDeafened ? 'red' : 'blue'}
              onPress={toggleDeafen}
              icon={isDeafened ? VolumeX : Volume2}
              circular
            />
            <Button
              size="$3"
              chromeless={!testMic}
              theme={testMic ? 'yellow' : 'gray'}
              onPress={onMicTest}
              icon={TestTube}
            >
              {testMic ? 'Hearing Self' : 'Test Mic'}
            </Button>
            <Button
              size="$3"
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
