/**
 * Audio module for Pomodoro — iOS Safari safe.
 *
 * Rules:
 * 1. AudioContext is created ONLY inside unlockAudioContext(), which must be
 *    called synchronously from a user-gesture handler (click / touchend).
 *    Creating an AudioContext before a gesture produces a suspended context
 *    that iOS will never allow to play.
 *
 * 2. ctx.resume() is called UNCONDITIONALLY in unlockAudioContext() on every
 *    gesture. iOS's ctx.state is unreliable — it can report "running" while
 *    audio is still blocked, especially after a lock-screen or background event.
 *
 * 3. All play*() functions guard with `if (!audioCtx) return` so they silently
 *    no-op if called before the first user gesture.
 */

let audioCtx: AudioContext | null = null

/** Returns the shared context, or null if not yet unlocked by a gesture. */
function getCtx(): AudioContext | null {
  return audioCtx
}

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
 *
 * - Creates the AudioContext on first call (lazy, gesture-gated).
 * - Calls ctx.resume() unconditionally — iOS ctx.state is unreliable;
 *   always re-issuing resume() is the only reliable way to re-activate
 *   after lock-screen / tab-switch / background.
 * - Plays a 1-frame silent buffer: required by iOS to mark the context
 *   as "user-activated" so future async playback is permitted.
 */
export function unlockAudioContext() {
  // Create lazily — only ever inside a user gesture.
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
  }

  // Unconditional resume — do NOT guard with ctx.state check.
  // iOS ctx.state is not reliable; calling resume() when already running is a no-op.
  audioCtx.resume().catch(() => {/* ignore */})

  // Silent 1-frame buffer: the canonical iOS unlock trick.
  try {
    const buf = audioCtx.createBuffer(1, 1, 22050)
    const src = audioCtx.createBufferSource()
    src.buffer = buf
    src.connect(audioCtx.destination)
    src.start(0)
  } catch {
    // Very old WebKit may throw — swallow silently.
  }
}

/**
 * Best-effort resume called from async contexts (e.g. setInterval tick).
 * Not a substitute for unlockAudioContext() — use this only to attempt
 * recovery when the context was suspended between ticks.
 */
export function resumeAudioContext() {
  if (audioCtx) {
    audioCtx.resume().catch(() => {/* ignore */})
  }
}
