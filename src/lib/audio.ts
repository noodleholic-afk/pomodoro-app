let audioCtx: AudioContext | null = null
let unlocked = false

function getCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
  }
  return audioCtx
}

function playTone(
  freq: number,
  type: OscillatorType,
  volume: number,
  duration: number,
  startTime?: number,
  freqEnd?: number
) {
  const ctx = getCtx()
  const osc = ctx.createOscillator()
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
  playTone(800, 'square', 0.03, 0.02)
}

export function playBreakTick() {
  const ctx = getCtx()
  playTone(600, 'sine', 0.025, 0.08, ctx.currentTime, 400)
}

export function playWorkAlarm() {
  const ctx = getCtx()
  for (let i = 0; i < 8; i++) {
    const freq = i % 2 === 0 ? 880 : 660
    playTone(freq, 'square', 0.3, 0.2, ctx.currentTime + i * 0.25)
  }
}

export function playBreakAlarm() {
  const ctx = getCtx()
  const notes = [261.6, 329.6, 392.0, 523.3] // C-E-G-C
  notes.forEach((freq, i) => {
    playTone(freq, 'sine', 0.25, 0.3, ctx.currentTime + i * 0.18)
  })
}

export function resumeAudioContext() {
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume()
  }
}

/**
 * Unlock Web Audio on iOS/mobile.
 * Must be called from a direct user gesture (click/touchend).
 * Plays a silent buffer to ungate the AudioContext.
 */
export function unlockAudioContext() {
  if (unlocked) return
  const ctx = getCtx()
  if (ctx.state === 'suspended') ctx.resume()
  // Play a silent buffer to fully unlock on iOS
  const buf = ctx.createBuffer(1, 1, 22050)
  const src = ctx.createBufferSource()
  src.buffer = buf
  src.connect(ctx.destination)
  src.start(0)
  unlocked = true
}
