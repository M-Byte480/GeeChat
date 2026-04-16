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
import type { KrispNoiseFilterProcessor } from '@livekit/krisp-noise-filter'
import { useAppStore } from 'app/features/home/hooks/useAppStore'

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
async function buildProcessedAudio(deviceId?: string | null): Promise<ProcessedAudio> {
  const audioConstraints: MediaTrackConstraints = {
    // Krisp handles noise suppression and works best on a clean signal.
    // Disable browser's own NS and AEC so they don't pre-process the audio
    // before Krisp sees it (AEC+Krisp fighting each other degrades quality).
    echoCancellation: { ideal: false },
    noiseSuppression: { ideal: false },
    autoGainControl: { ideal: false }, // AGC pumps the noise floor which creates static artifacts with Krisp
    channelCount: { ideal: 1 },
    ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
  }

  let rawStream: MediaStream
  try {
    rawStream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints })
  } catch (e) {
    console.warn('[mic] constrained getUserMedia failed, retrying with minimal constraints', e)
    rawStream = await navigator.mediaDevices.getUserMedia({
      audio: deviceId ? { deviceId: { exact: deviceId } } : true,
    })
  }

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const rawTrack = rawStream.getAudioTracks()[0]!
  const processAudioFrame: ((input: Float32Array) => number[]) | null =
    window.electronAPI?.processAudioFrame ?? null

  // AudioContext at the mic's native sample rate so Krisp's applyConstraints
  // (sampleRate: ctx.sampleRate) always matches what the device already reports.
  const micSampleRate = rawTrack.getSettings().sampleRate ?? 48000
  const ctx = new AudioContext({ sampleRate: micSampleRate })
  const source = ctx.createMediaStreamSource(rawStream)

  // Monitor (Test Mic): taps rawStream directly — low latency, no processing pipeline
  const monitorGain = ctx.createGain()
  monitorGain.gain.value = 0.8
  monitorGain.connect(ctx.destination)
  const rawMonitorSource = ctx.createMediaStreamSource(rawStream)
  const enableMonitor = () => rawMonitorSource.connect(monitorGain)
  const disableMonitor = () => {
    try { rawMonitorSource.disconnect(monitorGain) } catch { /* already disconnected */ }
  }

  // AnalyserNode for mic-level meter in the stats overlay
  const analyser = ctx.createAnalyser()
  analyser.fftSize = 256
  source.connect(analyser)
  const _analyserBuf = new Float32Array(analyser.fftSize)
  const getMicLevel = (): number => {
    analyser.getFloatTimeDomainData(_analyserBuf)
    let sum = 0
    for (let i = 0; i < _analyserBuf.length; i++) sum += _analyserBuf[i] * _analyserBuf[i]
    return Math.sqrt(sum / _analyserBuf.length)
  }

  if (!processAudioFrame) {
    // ── Non-native path (Tauri / web) ──────────────────────────────────────────
    // Return the real mic track directly. Krisp receives it and calls
    // applyConstraints on it — which works because it's a real capture track,
    // not a MediaStreamDestination track. No ScriptProcessor overhead.
    const setDenoise = (enabled: boolean) => {
      // Fallback toggle via browser-native NS (used only if Krisp isn't applied)
      rawTrack.applyConstraints({ noiseSuppression: enabled }).catch(() => {})
    }
    const cleanup = () => {
      disableMonitor()
      rawMonitorSource.disconnect()
      source.disconnect()
      rawStream.getTracks().forEach((t) => t.stop())
      ctx.close()
    }
    return { track: rawTrack, cleanup, enableMonitor, disableMonitor, setDenoise, getMicLevel, nativeAvailable: false }
  }

  // ── Native RNNoise path (Electron only) ────────────────────────────────────
  // ScriptProcessorNode synchronously calls the native .node addon per-frame.
  const BLOCK = 512 // ScriptProcessorNode buffer size (power-of-2 closest to 480)
  const FRAME = 480 // RNNoise frame size
  const inRing = new Float32Array(BLOCK + FRAME)
  const outRing = new Float32Array(BLOCK + FRAME)
  let inFill = 0
  let outLen = FRAME // pre-buffer 1 silent frame so queue never drains cold
  let denoiseEnabled = true

  const scriptNode = ctx.createScriptProcessor(BLOCK, 1, 1)
  scriptNode.onaudioprocess = (e: AudioProcessingEvent) => {
    const inp = e.inputBuffer.getChannelData(0)
    const out = e.outputBuffer.getChannelData(0)
    inRing.set(inp, inFill)
    inFill += inp.length
    while (inFill >= FRAME) {
      if (denoiseEnabled) {
        const processed = processAudioFrame(inRing.subarray(0, FRAME))
        for (let i = 0; i < FRAME; i++) outRing[outLen + i] = processed[i] ?? 0
      } else {
        outRing.set(inRing.subarray(0, FRAME), outLen)
      }
      outLen += FRAME
      inRing.copyWithin(0, FRAME, inFill)
      inFill -= FRAME
    }
    const toCopy = Math.min(outLen, out.length)
    out.set(outRing.subarray(0, toCopy))
    if (outLen > toCopy) outRing.copyWithin(0, toCopy, outLen)
    outLen -= toCopy
    for (let i = toCopy; i < out.length; i++) out[i] = 0
  }

  const dest = ctx.createMediaStreamDestination()
  source.connect(scriptNode)
  scriptNode.connect(dest)
  scriptNode.connect(analyser)

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const processedTrack = dest.stream.getAudioTracks()[0]!

  const setDenoise = (enabled: boolean) => { denoiseEnabled = enabled }
  const cleanup = () => {
    disableMonitor()
    rawMonitorSource.disconnect()
    source.disconnect()
    scriptNode.disconnect()
    rawStream.getTracks().forEach((t) => t.stop())
    ctx.close()
  }
  return { track: processedTrack, cleanup, enableMonitor, disableMonitor, setDenoise, getMicLevel, nativeAvailable: true }
}

export const VoiceRoom = ({
  channelId,
  nickname,
  serverUrl,
  onParticipantsChange,
  onDisconnect,
}: Props) => {
  console.warn('Rendered VoiceRoom for channelId:', channelId)
  const micDeviceId = useAppStore((s) => s.micDeviceId)
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

  const [denoiseAvailable, setDenoiseAvailable] = useState(false)
  const [showStats, setShowStats] = useState(false)
  const [voiceStats, setVoiceStats] = useState<VoiceStats | null>(null)
  const krispRef = useRef<KrispNoiseFilterProcessor | null>(null)
  const isDeafenedRef = useRef(false)

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
        el.muted = isDeafenedRef.current
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

  // Keep ref in sync so TrackSubscribed (which captures a stale closure) reads current value
  useEffect(() => { isDeafenedRef.current = isDeafened }, [isDeafened])

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

      console.log('[join] buildProcessedAudio...')
      const audio = await buildProcessedAudio(micDeviceId)
      console.log('[join] buildProcessedAudio done, nativeAvailable:', audio.nativeAvailable)
      audioRef.current = audio
      setNativeAvailable(audio.nativeAvailable)
      setDenoiseOn(audio.nativeAvailable)

      const newRoom = new Room({
        adaptiveStream: true,
        reconnectPolicy: {
          nextRetryDelayInMs: (context) => {
            if (context.retryCount >= 2) return null
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

      console.log('[join] connecting to', livekitUrl)
      await newRoom.connect(livekitUrl, token, { autoSubscribe: true })
      console.log('[join] connected')

      console.log('[join] publishing track...')
      const lkTrack = new LocalAudioTrack(audio.track)
      lkTrackRef.current = lkTrack
      await newRoom.localParticipant.publishTrack(lkTrack, {
        name: 'microphone',
        audioPreset: { maxBitrate: 64000 },
        dtx: true,
      })
      console.log('[join] track published')

      // Track already-present participants so deafen/undeafen works on them too
      newRoom.remoteParticipants.forEach((participant) => {
        participant.trackPublications.forEach((pub) => {
          if (pub.track && pub.kind === Track.Kind.Audio) {
            const el = pub.track.attach() as HTMLAudioElement
            remoteAudioEls.current.push(el)
            document.body.appendChild(el)
            el.play().catch(() => {})
          }
        })
      })

      // Krisp noise suppression — WASM-based, works in Tauri WebView2.
      // Dynamically imported so its browser-API side effects don't run during SSR
      // (a static import breaks Tamagui's theme CSS injection via hydration mismatch).
      const { KrispNoiseFilter, isKrispNoiseFilterSupported } = await import('@livekit/krisp-noise-filter')

      console.log('[join] krisp supported:', isKrispNoiseFilterSupported(), 'nativeAvailable:', audio.nativeAvailable)
      if (!audio.nativeAvailable && isKrispNoiseFilterSupported()) {
        console.log('[join] applying Krisp processor...')
        const krisp = KrispNoiseFilter({ quality: 'high', useBVC: true, bufferDropMs: 200 })
        krispRef.current = krisp

        await lkTrack.setProcessor(krisp)
        console.log('[join] Krisp applied')

        setDenoiseOn(true)
        setDenoiseAvailable(true)
      } else if (audio.nativeAvailable) {
        setDenoiseAvailable(true)
      }

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

  const toggleDeafen = async () => {
    const next = !isDeafened
    remoteAudioEls.current.forEach((el) => { el.muted = next })
    // Discord behavior: deafening silences your mic too
    if (next && isMicEnabled && lkTrackRef.current) {
      await lkTrackRef.current.mute()
      setIsMicEnabled(false)
    }
    isDeafenedRef.current = next
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
    krispRef.current = null
    remoteAudioEls.current = []
    isDeafenedRef.current = false
    setRoom(null)
    setIsJoined(false)
    setIsMicEnabled(true)
    setIsDeafened(false)
    setTestMic(false)
    setDenoiseOn(true)
    setNativeAvailable(false)
    setDenoiseAvailable(false)
    setShowStats(false)
    setVoiceStats(null)
    onParticipantsChange(channelId, [])
    broadcastToServer(channelId, [])
    onDisconnect?.()
  }

  const toggleDenoise = async () => {
    const next = !denoiseOn
    setDenoiseOn(next)
    if (nativeAvailable) {
      // RNNoise path — synchronous toggle in the ScriptProcessor
      audioRef.current?.setDenoise(next)
    } else if (krispRef.current) {
      // Krisp path — toggle via setEnabled (processor stays attached, no re-init)
      await krispRef.current.setEnabled(next)
    }
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

      <MicSelector />

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
            {denoiseAvailable && (
              <Button
                size="$3"
                theme={denoiseOn ? 'green' : 'gray'}
                onPress={toggleDenoise}
                icon={Wand2}
              >
                {denoiseOn ? 'Denoise On' : 'Denoise Off'}
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

// ── Mic device selector ───────────────────────────────────────────────────────

function MicSelector() {
  const micDeviceId = useAppStore((s) => s.micDeviceId)
  const setMicDeviceId = useAppStore((s) => s.setMicDeviceId)
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])

  useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then((all) => {
      setDevices(all.filter((d) => d.kind === 'audioinput'))
    })
  }, [])

  if (devices.length === 0) return null

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ fontSize: 11, color: '#9ca3af', flexShrink: 0 }}>Mic</span>
      <select
        value={micDeviceId ?? 'default'}
        onChange={(e) => setMicDeviceId(e.target.value === 'default' ? null : e.target.value)}
        style={{
          flex: 1,
          fontSize: 11,
          background: 'rgba(255,255,255,0.07)',
          color: '#e5e7eb',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: 4,
          padding: '2px 4px',
          outline: 'none',
          cursor: 'pointer',
        }}
      >
        <option value="default" style={{ background: '#1f2937' }}>Default</option>
        {devices.map((d) => (
          <option key={d.deviceId} value={d.deviceId} style={{ background: '#1f2937' }}>
            {d.label || d.deviceId.slice(0, 12)}
          </option>
        ))}
      </select>
    </div>
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
