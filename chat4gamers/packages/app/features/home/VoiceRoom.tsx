import { useEffect, useRef, useState } from 'react'
import { Button, Text, XStack, YStack } from '@my/ui'
import { ConnectionQuality, LocalAudioTrack, Room, RoomEvent, Track } from 'livekit-client'
import {
  Activity,
  Mic,
  MicOff,
  PhoneOff,
  TestTube,
  Volume2,
  VolumeX,
  Wand2,
} from 'lucide-react'
import { apiFetch } from '@my/api-client'
import { KrispNoiseFilter, isKrispNoiseFilterSupported } from '@livekit/krisp-noise-filter'

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
  getMicLevel: () => number
  nativeAvailable: boolean
}

type VoiceStats = {
  micLevel: number           // RMS 0–1
  quality: ConnectionQuality | null
  // inbound (what we hear from remotes)
  inJitter: number           // seconds
  inPacketsLost: number
  inAudioLevel: number       // 0–1
  // outbound (what we send)
  outBytesSent: number       // total bytes since connection
  outPacketsSent: number
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
    window.electronAPI?.processAudioFrame ?? null

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
        for (let i = 0; i < FRAME; i++) outRing[outLen + i] = processed[i] ?? 0
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

  // Monitor (Test Mic): tap rawStream directly — bypasses the ScriptProcessorNode
  // pipeline so you hear yourself with minimal latency. Undenoised, but that's fine
  // since the only purpose of Test Mic is to confirm the mic is capturing.
  const monitorGain = ctx.createGain()
  monitorGain.gain.value = 0.8
  monitorGain.connect(ctx.destination)
  const rawMonitorSource = ctx.createMediaStreamSource(rawStream)

  const enableMonitor = () => rawMonitorSource.connect(monitorGain)
  const disableMonitor = () => {
    try {
      rawMonitorSource.disconnect(monitorGain)
    } catch {
      /* already disconnected */
    }
  }

  // AnalyserNode for mic-level meter in the stats overlay
  const analyser = ctx.createAnalyser()
  analyser.fftSize = 256
  scriptNode.connect(analyser)
  const _analyserBuf = new Float32Array(analyser.fftSize)
  const getMicLevel = (): number => {
    analyser.getFloatTimeDomainData(_analyserBuf)
    let sum = 0
    for (let i = 0; i < _analyserBuf.length; i++) sum += _analyserBuf[i] * _analyserBuf[i]
    return Math.sqrt(sum / _analyserBuf.length) // RMS 0–1
  }

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const processedTrack = dest.stream.getAudioTracks()[0]!

  const cleanup = () => {
    disableMonitor()
    rawMonitorSource.disconnect()
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
    getMicLevel,
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
  console.warn('Rendered VoiceRoom for channelId:', channelId)
  const [room, setRoom] = useState<Room | null>(null)
  const [isJoined, setIsJoined] = useState(false)
  const [isMicEnabled, setIsMicEnabled] = useState(true)
  const [isDeafened, setIsDeafened] = useState(false)
  const [testMic, setTestMic] = useState(false)
  const [denoiseOn, setDenoiseOn] = useState(true)
  const [nativeAvailable, setNativeAvailable] = useState(false)
  const audioRef = useRef<ProcessedAudio | null>(null)
  const lkTrackRef = useRef<LocalAudioTrack | null>(null)
  const remoteAudioEls = useRef<HTMLAudioElement[]>([])

  const [showStats, setShowStats] = useState(false)
  const [voiceStats, setVoiceStats] = useState<VoiceStats | null>(null)

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
        const el = track.attach() as HTMLAudioElement
        el.muted = isDeafened
        remoteAudioEls.current.push(el)
        document.body.appendChild(el)
        el.play().catch((err) => console.warn('Autoplay blocked:', err))
      }
    })
    room.on(RoomEvent.TrackUnsubscribed, (track) => {
      track.detach().forEach((el) => {
        remoteAudioEls.current = remoteAudioEls.current.filter((e) => e !== el)
        el.remove()
      })
    })
    return () => {
      room.removeAllListeners()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Track connection quality via LiveKit event (fires for local + remote participants)
  useEffect(() => {
    if (!room) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handler = (quality: ConnectionQuality, _participant: any) => {
      // Only update stats for the local participant
      if (_participant !== room.localParticipant) return
      setVoiceStats((prev) =>
        prev
          ? { ...prev, quality }
          : { micLevel: 0, quality, inJitter: 0, inPacketsLost: 0, inAudioLevel: 0, outBytesSent: 0, outPacketsSent: 0 }
      )
    }
    room.on(RoomEvent.ConnectionQualityChanged, handler)
    return () => { room.off(RoomEvent.ConnectionQualityChanged, handler) }
  }, [room])

  // Poll RTC stats every second while stats overlay is visible
  useEffect(() => {
    if (!room || !showStats || !isJoined) return

    const poll = async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const engine = (room as any).engine
      const subPc: RTCPeerConnection | undefined = engine?.subscriber?.pc
      const pubPc: RTCPeerConnection | undefined = engine?.publisher?.pc

      let inJitter = 0, inPacketsLost = 0, inAudioLevel = 0
      let outBytesSent = 0, outPacketsSent = 0

      if (subPc) {
        const report = await subPc.getStats()
        report.forEach((s: RTCStats) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const stat = s as any
          if (stat.type === 'inbound-rtp' && stat.kind === 'audio') {
            inJitter = stat.jitter ?? 0
            inPacketsLost = stat.packetsLost ?? 0
            inAudioLevel = stat.audioLevel ?? 0
          }
        })
      }

      if (pubPc) {
        const report = await pubPc.getStats()
        report.forEach((s: RTCStats) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const stat = s as any
          if (stat.type === 'outbound-rtp' && stat.kind === 'audio') {
            outBytesSent = stat.bytesSent ?? 0
            outPacketsSent = stat.packetsSent ?? 0
          }
        })
      }

      const micLevel = audioRef.current?.getMicLevel() ?? 0

      setVoiceStats((prev) => ({
        micLevel,
        quality: prev?.quality ?? null,
        inJitter,
        inPacketsLost,
        inAudioLevel,
        outBytesSent,
        outPacketsSent,
      }))
    }

    poll()
    const id = setInterval(poll, 1000)
    return () => clearInterval(id)
  }, [room, showStats, isJoined])

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

      const { token, livekitUrl } = await resp.json()

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

      await newRoom.connect(livekitUrl, token, { autoSubscribe: true })

      const lkTrack = new LocalAudioTrack(audio.track)
      lkTrackRef.current = lkTrack
      await newRoom.localParticipant.publishTrack(lkTrack, {
        name: 'microphone',
        // Stage 2: 64 kbps + DTX (silence suppression) for better quality & bandwidth
        audioPreset: { maxBitrate: 64000 },
        dtx: true,
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

      const remoteIds = Array.from(newRoom.remoteParticipants.values()).map(
        (p) => p.identity
      )
      onParticipantsChange(channelId, [nickname, ...remoteIds])
      broadcastToServer(channelId, [nickname, ...remoteIds])
    } catch (err) {
      console.error(`Failed to join ${channelId}:`, err)
    }
  }

  const toggleMic = async () => {
    if (!lkTrackRef.current) return
    const next = !isMicEnabled
    if (next) {
      await lkTrackRef.current.unmute()
    } else {
      await lkTrackRef.current.mute()
    }
    setIsMicEnabled(next)
  }

  const toggleDeafen = () => {
    const next = !isDeafened
    remoteAudioEls.current.forEach((el) => { el.muted = next })
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
    lkTrackRef.current = null
    remoteAudioEls.current = []
    setRoom(null)
    setIsJoined(false)
    setIsMicEnabled(true)
    setIsDeafened(false)
    setTestMic(false)
    setDenoiseOn(true)
    setNativeAvailable(false)
    setShowStats(false)
    setVoiceStats(null)
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
    <YStack
      p="$3"
      borderTopWidth={1}
      borderColor="$borderColor"
      bg="$color2"
      gap="$2"
    >
      <Text
        fontSize="$2"
        fontWeight="600"
        color={isJoined ? '$green10' : '$color10'}
      >
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
            <Button
              size="$3"
              chromeless={!showStats}
              theme={showStats ? 'blue' : 'gray'}
              onPress={() => setShowStats((p) => !p)}
              icon={Activity}
            >
              Stats
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

      {/* Stage 1 — RTC stats overlay, shown while joined and Stats button is active */}
      {isJoined && showStats && (
        <YStack
          p="$2"
          borderRadius="$2"
          bg="$color1"
          borderWidth={1}
          borderColor="$borderColor"
          gap="$1"
        >
          <StatsOverlay stats={voiceStats} />
        </YStack>
      )}
    </YStack>
  )
}

// ── Stats overlay ─────────────────────────────────────────────────────────────

function qualityColor(q: ConnectionQuality | null): string {
  if (q === ConnectionQuality.Excellent) return '#22c55e'
  if (q === ConnectionQuality.Good) return '#84cc16'
  if (q === ConnectionQuality.Poor) return '#f59e0b'
  if (q === ConnectionQuality.Lost) return '#ef4444'
  return '#9ca3af'
}

function MicMeter({ level }: { level: number }) {
  const pct = Math.min(100, Math.round(level * 400)) // scale 0–0.25 RMS → 0–100%
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ fontSize: 11, color: '#9ca3af', width: 80 }}>Mic level</span>
      <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          background: pct > 80 ? '#ef4444' : pct > 40 ? '#22c55e' : '#3b82f6',
          transition: 'width 0.1s ease',
          borderRadius: 3,
        }} />
      </div>
      <span style={{ fontSize: 10, color: '#6b7280', width: 30, textAlign: 'right' }}>{pct}%</span>
    </div>
  )
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontFamily: 'monospace' }}>
      <span style={{ color: '#9ca3af' }}>{label}</span>
      <span style={{ color: '#e5e7eb' }}>{value}</span>
    </div>
  )
}

function StatsOverlay({ stats }: { stats: VoiceStats | null }) {
  if (!stats) {
    return <span style={{ fontSize: 11, color: '#6b7280' }}>Waiting for stats…</span>
  }

  const jitterMs = (stats.inJitter * 1000).toFixed(1)
  const lossStr = stats.inPacketsLost > 0 ? `${stats.inPacketsLost} pkts` : '0'
  const inLevelPct = Math.round(stats.inAudioLevel * 100)
  const outKbps = stats.outBytesSent > 0
    ? `${Math.round(stats.outBytesSent / 1024)} KB sent`
    : '—'
  const qualityLabel = stats.quality !== null
    ? ConnectionQuality[stats.quality] ?? 'Unknown'
    : 'Measuring…'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <MicMeter level={stats.micLevel} />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontFamily: 'monospace' }}>
        <span style={{ color: '#9ca3af' }}>Connection</span>
        <span style={{ color: qualityColor(stats.quality), fontWeight: 600 }}>{qualityLabel}</span>
      </div>
      <StatRow label="Inbound jitter" value={`${jitterMs} ms`} />
      <StatRow label="Packet loss" value={lossStr} />
      <StatRow label="Remote audio" value={`${inLevelPct}%`} />
      <StatRow label="Outbound" value={outKbps} />
    </div>
  )
}
