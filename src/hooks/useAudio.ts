import { useCallback, useRef } from 'react'
import {
  playWorkTick,
  playBreakTick,
  playWorkAlarm,
  playBreakAlarm,
  resumeAudioContext,
} from '../lib/audio'
import type { Phase } from '../types'

export function useAudio(soundEnabled: boolean) {
  const lastTickSecRef = useRef<number>(-1)

  const tick = useCallback((remaining: number, phase: Phase) => {
    if (!soundEnabled) return
    if (remaining === lastTickSecRef.current) return
    lastTickSecRef.current = remaining
    resumeAudioContext()
    if (phase === 'work') playWorkTick()
    else playBreakTick()
  }, [soundEnabled])

  const alarm = useCallback((phase: Phase) => {
    if (!soundEnabled) return
    resumeAudioContext()
    if (phase === 'work') playWorkAlarm()
    else playBreakAlarm()
  }, [soundEnabled])

  return { tick, alarm }
}
