import { useEffect, useRef, useState } from 'react'
import { Button, YStack, Text, XStack } from '@my/ui'
import { Room, RoomEvent, Track, LocalAudioTrack } from 'livekit-client'
import { Mic, MicOff, PhoneOff, TestTube, Volume2, VolumeX, Wand2 } from 'lucide-react'
import { apiFetch } from '@my/api-client'

type Props = {
  channelId: string
  nickname: string
  serverUrl: string
  onParticipantsChange: (channelId: string, participants: string[]) => void
  onDisconnect?: () => void
}

type ProcessedAudio = {
  track: MediaStreamTrack
  cleanup: () => void
  enableMonitor: () => void
  disableMonitor: () => void
  setDenoise: (enabled: boolean) => void
  nativeAvailable: boolean
}

/**
 * Build a noise-suppressed MediaStreamTrack via the native RNNoise .node addon.
 *
 * Architecture:
 *   getUserMedia → AudioContext → ScriptProcessorNode → MediaStreamDestination
 *
 * The ScriptProcessorNode runs on the main JS thread and calls
 * window.electronAPI.processAudioFrame() synchronously — a contextBridge proxy
 * to the preload's napi-rs Denoiser instance.  No WASM, no AudioWorklet, no IPC.
 *
 * Ring buffer: ScriptProcessorNode delivers 512-sample blocks; RNNoise needs
 * 480 samples.  LCM(512, 480) = 7680 → the 15-block / 16-frame cycle balances
 * perfectly.  Pre-buffer of 480 silence samples prevents cold-start underruns.
 *
 * Fallback: if the native addon is unavailable (web, or first-run before build),
 * audio passes through unprocessed — the browser's own echoCancellation still runs.
 */
async function buildProcessedAudio(): Promise<ProcessedAudio> {
  const rawStream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: false, // RNNoise handles this natively
      autoGainControl: true,
      sampleRate: 48000,
      channelCount: 1,
    },
  })

  const ctx = new AudioContext({ sampleRate: 48000 })

  const processAudioFrame: ((input: Float32Array) => number[]) | null =
    (window as any).electronAPI?.processAudioFrame ?? null

  const BLOCK = 512 // ScriptProcessorNode buffer size (power-of-2 closest to 480)
  const FRAME = 480 // RNNoise frame size
  const inRing = new Float32Array(BLOCK + FRAME) // 992 samples — fits max inFill
  const outRing = new Float32Array(BLOCK + FRAME) // 992 samples — fits max outLen
  let inFill = 0
  let outLen = FRAME // pre-buffer 1 silent frame so queue never drains cold
  let denoiseEnabled = !!processAudioFrame // mutable flag — toggled at runtime

   
  const scriptNode = ctx.createScriptProcessor(BLOCK, 1, 1)

  scriptNode.onaudioprocess = (e: AudioProcessingEvent) => {
    const inp = e.inputBuffer.getChannelData(0)
    const out = e.outputBuffer.getChannelData(0)

    // Accumulate BLOCK new input samples
    inRing.set(inp, inFill)
    inFill += inp.length // always BLOCK

    if (processAudioFrame && denoiseEnabled) {
      // Native RNNoise path — synchronous, zero IPC
      while (inFill >= FRAME) {
        const processed = processAudioFrame(inRing.subarray(0, FRAME))
        for (let i = 0; i < FRAME; i++) outRing[outLen + i] = processed[i]!
        outLen += FRAME
        inRing.copyWithin(0, FRAME, inFill)
        inFill -= FRAME
      }
    } else {
      // Raw / fallback: bypass — copy input straight to output ring
      while (inFill >= FRAME) {
        outRing.set(inRing.subarray(0, FRAME), outLen)
        outLen += FRAME
        inRing.copyWithin(0, FRAME, inFill)
        inFill -= FRAME
      }
    }

    // Drain output ring → Web Audio output
    const toCopy = Math.min(outLen, out.length)
    out.set(outRing.subarray(0, toCopy))
    if (outLen > toCopy) outRing.copyWithin(0, toCopy, outLen)
    outLen -= toCopy
    for (let i = toCopy; i < out.length; i++) out[i] = 0
  }

  const source = ctx.createMediaStreamSource(rawStream)
  const dest = ctx.createMediaStreamDestination()

  source.connect(scriptNode)
  scriptNode.connect(dest)

  // Monitor (Test Mic): connect processor directly to ctx.destination —
  // avoids MediaStream → <audio> jitter buffer that causes its own stuttering.
  const monitorGain = ctx.createGain()
  monitorGain.gain.value = 0.5
  monitorGain.connect(ctx.destination)

  const enableMonitor = () => scriptNode.connect(monitorGain)
  const disableMonitor = () => {
    try {
      scriptNode.disconnect(monitorGain)
    } catch {}
  }

  const processedTrack = dest.stream.getAudioTracks()[0]!

  const cleanup = () => {
    disableMonitor()
    source.disconnect()
    scriptNode.disconnect()
    rawStream.getTracks().forEach((t) => t.stop())
    ctx.close()
  }

  const setDenoise = (enabled: boolean) => {
    denoiseEnabled = enabled
  }

  return {
    track: processedTrack,
    cleanup,
    enableMonitor,
    disableMonitor,
    setDenoise,
    nativeAvailable: !!processAudioFrame,
  }
}

export const VoiceRoom = ({
  channelId,
  nickname,
  serverUrl,
  onParticipantsChange,
  onDisconnect,
}: Props) => {
  const livekitWs = serverUrl.replace(/^https:\/\//, 'wss://').replace(/^http:\/\//, 'ws://')
  console.log('Rendered VoiceRoom for channelId:', channelId)
  const [room, setRoom] = useState<Room | null>(null)
  const [isJoined, setIsJoined] = useState(false)
  const [isMicEnabled, setIsMicEnabled] = useState(true)
  const [isDeafened, setIsDeafened] = useState(false)
  const [testMic, setTestMic] = useState(false)
  const [denoiseOn, setDenoiseOn] = useState(true)
  const [nativeAvailable, setNativeAvailable] = useState(false)
  const audioRef = useRef<ProcessedAudio | null>(null)

  const broadcastToServer = (ch: string, participants: string[]) => {
    apiFetch(`${serverUrl}`, `/voice-state`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channelId: ch, participants }),
    }).catch(() => {})
  }

  useEffect(() => {
    if (!room) return
    const getParticipants = () => [
      nickname,
      ...Array.from(room.remoteParticipants.values()).map((p) => p.identity),
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
        el.play().catch((err) => console.warn('Autoplay blocked:', err))
      }
    })
    room.on(RoomEvent.TrackUnsubscribed, (track) => {
      track.detach().forEach((el) => el.remove())
    })
    return () => {
      room.removeAllListeners()
    }
  }, [room, channelId, nickname, onParticipantsChange])

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
      const resp = await apiFetch(
        `${serverUrl}`,
        `/get-voice-token?room=${channelId}&identity=${encodeURIComponent(nickname)}`
      )

      if (!resp.ok) {
        console.error(`Voice token fetch failed: ${resp.status}`)
        return // stop here, don't proceed to buildProcessedAudio or connect
      }

      const { token } = await resp.json()

      const audio = await buildProcessedAudio()
      audioRef.current = audio
      setNativeAvailable(audio.nativeAvailable)
      setDenoiseOn(audio.nativeAvailable)

      // Todo: figure out on room that doesn't exists why it permanently oscillating between calling and getting 404
      /**
       * <-- GET /rtc/validate?access_token=eyJhbGciOiJIUzI1NiJ9.eyJ2aWRlbyI6eyJyb29tSm9pbiI6dHJ1ZSwicm9vbSI6ImhpZGVvdXQiLCJjYW5QdWJsaXNoIjp0cnVlLCJjYW5TdWJzY3JpYmUiOnRydWUsInJvb21BZG1pbiI6dHJ1ZX0sImlzcyI6ImRldmtleSIsImV4cCI6MTc3MzgxMDEyMCwibmJmIjowLCJzdWIiOiJUaGVNZWxvbm5NYW5uIn0.7P_pLP8ZS-Ku_TxC6bd5aHVxq2DwDKwYyYvsmg6BzI4&auto_subscribe=1&sdk=js&version=2.17.1&protocol=16&adaptive_stream=1
       * --> GET /rtc/validate?access_token=eyJhbGciOiJIUzI1NiJ9.eyJ2aWRlbyI6eyJyb29tSm9pbiI6dHJ1ZSwicm9vbSI6ImhpZGVvdXQiLCJjYW5QdWJsaXNoIjp0cnVlLCJjYW5TdWJzY3JpYmUiOnRydWUsInJvb21BZG1pbiI6dHJ1ZX0sImlzcyI6ImRldmtleSIsImV4cCI6MTc3MzgxMDEyMCwibmJmIjowLCJzdWIiOiJUaGVNZWxvbm5NYW5uIn0.7P_pLP8ZS-Ku_TxC6bd5aHVxq2DwDKwYyYvsmg6BzI4&auto_subscribe=1&sdk=js&version=2.17.1&protocol=16&adaptive_stream=1 404 0ms
       */
      const newRoom = new Room({
        adaptiveStream: true,
        reconnectPolicy: {
          nextRetryDelayInMs: (context) => {
            // Stop retrying after 2 attempts
            if (context.retryCount >= 2) return null // null = stop retrying
            return 1000 * context.retryCount
          },
        },
      })

      newRoom.on(RoomEvent.Disconnected, (reason) => {
        console.warn('[VoiceRoom] disconnected, reason:', reason)
        audioRef.current?.cleanup()
        audioRef.current = null
        setRoom(null)
        setIsJoined(false)
      })

      await newRoom.connect(livekitWs, token, { autoSubscribe: true })

      const lkTrack = new LocalAudioTrack(audio.track)
      await newRoom.localParticipant.publishTrack(lkTrack, {
        name: 'microphone',
        audioPreset: { maxBitrate: 48000 },
      })

      newRoom.remoteParticipants.forEach((participant) => {
        participant.trackPublications.forEach((pub) => {
          if (pub.track && pub.kind === Track.Kind.Audio) {
            const el = pub.track.attach()
            document.body.appendChild(el)
            el.play().catch(() => {})
          }
        })
      })

      setRoom(newRoom)
      setIsJoined(true)

      const remoteIds = Array.from(newRoom.remoteParticipants.values()).map((p) => p.identity)
      onParticipantsChange(channelId, [nickname, ...remoteIds])
      broadcastToServer(channelId, [nickname, ...remoteIds])
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
    room.remoteParticipants.forEach((p) => p.setVolume(next ? 0 : 1))
    setIsDeafened(next)
  }

  const onMicTest = () => {
    const next = !testMic
    setTestMic(next)
    if (next) {
      audioRef.current?.enableMonitor()
    } else {
      audioRef.current?.disableMonitor()
    }
  }

  const leaveRoom = async () => {
    if (!room) return
    await room.disconnect()
    audioRef.current?.cleanup()
    audioRef.current = null
    setRoom(null)
    setIsJoined(false)
    setIsMicEnabled(true)
    setIsDeafened(false)
    setTestMic(false)
    setDenoiseOn(true)
    setNativeAvailable(false)
    onParticipantsChange(channelId, [])
    broadcastToServer(channelId, [])
    onDisconnect?.()
  }

  const toggleDenoise = () => {
    const next = !denoiseOn
    setDenoiseOn(next)
    audioRef.current?.setDenoise(next)
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
            {nativeAvailable && (
              <Button
                size="$3"
                theme={denoiseOn ? 'green' : 'gray'}
                onPress={toggleDenoise}
                icon={Wand2}
              >
                {denoiseOn ? 'RNNoise On' : 'RNNoise Off'}
              </Button>
            )}
            <Button size="$3" theme="red" variant="outlined" onPress={leaveRoom} icon={PhoneOff}>
              Leave
            </Button>
          </>
        )}
      </XStack>
    </YStack>
  )
}
