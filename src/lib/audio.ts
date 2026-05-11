/**
 * Audio module for Pomodoro — iOS Safari safe, lock-screen persistent.
 *
 * Lock-screen keep-alive strategy (two layers):
 * 1. startKeepAlive() — loops a near-silent BufferSource so the AudioContext
 *    is always producing output. iOS suspends idle contexts on lock; a looping
 *    source (even at 1e-8 amplitude) prevents that.
 * 2. setupMediaSession() — registers a MediaSession with playbackState='playing'
 *    so the OS treats this as an active media app and won't kill the audio session.
 *
 * Unlock rules (unchanged):
 * - AudioContext created ONLY inside unlockAudioContext() (user-gesture gated).
 * - ctx.resume() called unconditionally on every gesture (iOS state is unreliable).
 */

let audioCtx: AudioContext | null = null
let keepAliveSource: AudioBufferSourceNode | null = null

function getCtx(): AudioContext | null {
  return audioCtx
}

// ─── Keep-alive loop ──────────────────────────────────────────────────────────
// Plays a 2-second looping buffer of near-silence (1Hz sine at 1e-8 amplitude).
// Inaudible to humans but keeps the AudioContext "active" through a lock screen.
function startKeepAlive(ctx: AudioContext) {
  if (keepAliveSource) return
  try {
    const sr  = ctx.sampleRate
    const buf = ctx.createBuffer(1, sr * 2, sr)
    const ch  = buf.getChannelData(0)
    for (let i = 0; i < ch.length; i++) {
      ch[i] = Math.sin(2 * Math.PI * i / sr) * 1e-8
    }
    keepAliveSource = ctx.createBufferSource()
    keepAliveSource.buffer = buf
    keepAliveSource.loop   = true
    keepAliveSource.connect(ctx.destination)
    keepAliveSource.start()
  } catch { /* ignore */ }
}

// ─── MediaSession ─────────────────────────────────────────────────────────────
// Tells the OS this is an active media session so it won't terminate audio.
function setupMediaSession() {
  if (!('mediaSession' in navigator)) return
  try {
    navigator.mediaSession.metadata = new MediaMetadata({
      title:  'Pomodoro Timer',
      artist: 'Focus',
    })
    // Handlers are required — iOS ignores sessions with no registered handlers.
    navigator.mediaSession.setActionHandler('play',  () => { audioCtx?.resume().catch(() => {}) })
    navigator.mediaSession.setActionHandler('pause', () => { /* ignore — keep running */ })
    navigator.mediaSession.playbackState = 'playing'
  } catch { /* API unavailable */ }
}

// ─── Tone primitives ──────────────────────────────────────────────────────────
function playTone(
  ctx: AudioContext,
  freq: number,
  type: OscillatorType,
  volume: number,
  duration: number,
  startTime?: number,
  freqEnd?: number
) {
  const osc  = ctx.createOscillator()
  const gain = ctx.createGain()

  osc.type = type
  osc.frequency.setValueAtTime(freq, startTime ?? ctx.currentTime)
  if (freqEnd !== undefined) {
    osc.frequency.linearRampToValueAtTime(freqEnd, (startTime ?? ctx.currentTime) + duration)
  }

  gain.gain.setValueAtTime(volume, startTime ?? ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, (startTime ?? ctx.currentTime) + duration)

  osc.connect(gain)
  gain.connect(ctx.destination)

  osc.start(startTime ?? ctx.currentTime)
  osc.stop((startTime ?? ctx.currentTime) + duration)
}

// ─── Public sound API ─────────────────────────────────────────────────────────
export function playWorkTick() {
  const ctx = getCtx()
  if (!ctx) return
  playTone(ctx, 800, 'square', 0.03, 0.02)
}

export function playBreakTick() {
  const ctx = getCtx()
  if (!ctx) return
  playTone(ctx, 600, 'sine', 0.025, 0.08, ctx.currentTime, 400)
}

export function playWorkAlarm() {
  const ctx = getCtx()
  if (!ctx) return
  for (let i = 0; i < 8; i++) {
    const freq = i % 2 === 0 ? 880 : 660
    playTone(ctx, freq, 'square', 0.3, 0.2, ctx.currentTime + i * 0.25)
  }
}

export function playBreakAlarm() {
  const ctx = getCtx()
  if (!ctx) return
  const notes = [261.6, 329.6, 392.0, 523.3] // C-E-G-C
  notes.forEach((freq, i) => {
    playTone(ctx, freq, 'sine', 0.25, 0.3, ctx.currentTime + i * 0.18)
  })
}

/**
 * MUST be called synchronously inside a user-gesture handler.
 * Creates (once) and resumes the AudioContext, then starts keep-alive.
 */
export function unlockAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
    setupMediaSession()
  }

  // Unconditional resume — iOS ctx.state is unreliable.
  audioCtx.resume().catch(() => {})

  // Silent 1-frame buffer — canonical iOS unlock trick.
  try {
    const buf = audioCtx.createBuffer(1, 1, 22050)
    const src = audioCtx.createBufferSource()
    src.buffer = buf
    src.connect(audioCtx.destination)
    src.start(0)
  } catch { /* very old WebKit */ }

  // Start keep-alive loop (no-op if already running).
  startKeepAlive(audioCtx)
}

/**
 * Best-effort resume from async contexts (e.g. setInterval tick).
 * Also updates MediaSession playbackState so the OS knows we're still active.
 */
export function resumeAudioContext() {
  if (!audioCtx) return
  audioCtx.resume().catch(() => {})
  try {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = 'playing'
    }
  } catch { /* ignore */ }
}
