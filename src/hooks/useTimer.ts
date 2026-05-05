import { useState, useEffect, useCallback, useRef } from 'react'
import type { Phase, TimerState, Interruption } from '../types'
import { PHASE_DURATIONS, POMODOROS_BEFORE_LONG_BREAK } from '../lib/constants'
import { useAudio } from './useAudio'

export interface TimerData {
  phase: Phase
  state: TimerState
  remaining: number        // seconds left
  totalSeconds: number
  completedCount: number   // 0-3 within the current cycle
  taskName: string
  taskId: string
  area: string
  startedAt: string | null
  urgentItems: Interruption[]
  memoItems: Interruption[]
}

interface UseTimerOptions {
  soundEnabled: boolean
  onPhaseComplete: (phase: Phase, data: TimerData) => void
  onSessionChange: (data: Partial<TimerData> & { endTime?: string | null; pauseRemaining?: number | null }) => void
}

function calcRemaining(endTime: string | null, pauseRemaining: number | null): number {
  if (pauseRemaining !== null) return pauseRemaining
  if (!endTime) return 0
  return Math.max(0, Math.round((new Date(endTime).getTime() - Date.now()) / 1000))
}

export function useTimer({ soundEnabled, onPhaseComplete, onSessionChange }: UseTimerOptions) {
  const [data, setData] = useState<TimerData>({
    phase: 'work',
    state: 'idle',
    remaining: PHASE_DURATIONS['work'],
    totalSeconds: PHASE_DURATIONS['work'],
    completedCount: 0,
    taskName: '',
    taskId: '',
    area: '',
    startedAt: null,
    urgentItems: [],
    memoItems: [],
  })

  const endTimeRef = useRef<string | null>(null)
  const pauseRemainingRef = useRef<number | null>(null)
  const stateRef = useRef<TimerState>('idle')
  const dataRef = useRef<TimerData>(data)
  dataRef.current = data

  const { tick, alarm } = useAudio(soundEnabled)

  // Tick interval
  useEffect(() => {
    if (data.state !== 'running') return
    const interval = setInterval(() => {
      const rem = calcRemaining(endTimeRef.current, null)
      setData(prev => ({ ...prev, remaining: rem }))
      tick(rem, data.phase)
      if (rem === 0) {
        clearInterval(interval)
        alarm(data.phase)
        stateRef.current = 'completed'
        setData(prev => {
          const next = { ...prev, state: 'completed' as TimerState }
          onPhaseComplete(prev.phase, next)
          return next
        })
      }
    }, 500)
    return () => clearInterval(interval)
  }, [data.state, data.phase, tick, alarm, onPhaseComplete])

  // Restore from Supabase session
  const restoreSession = useCallback((session: {
    phase: Phase
    total_seconds: number
    end_time: string | null
    pause_remaining: number | null
    completed_count: number
    task_name: string | null
    task_id: string | null
    area: string | null
    interruptions_urgent: Interruption[]
    interruptions_memo: Interruption[]
    started_at: string | null
  }) => {
    endTimeRef.current = session.end_time
    pauseRemainingRef.current = session.pause_remaining

    const remaining = calcRemaining(session.end_time, session.pause_remaining)
    const state: TimerState = session.end_time
      ? (remaining > 0 ? 'running' : 'completed')
      : session.pause_remaining !== null
        ? 'paused'
        : 'idle'

    stateRef.current = state
    setData({
      phase: session.phase,
      state,
      remaining,
      totalSeconds: session.total_seconds,
      completedCount: session.completed_count,
      taskName: session.task_name || '',
      taskId: session.task_id || '',
      area: session.area || '',
      startedAt: session.started_at,
      urgentItems: session.interruptions_urgent || [],
      memoItems: session.interruptions_memo || [],
    })
  }, [])

  const start = useCallback((taskName: string, taskId: string, area: string) => {
    console.log('[useTimer.start]', { taskName, taskId, area })
    const total = PHASE_DURATIONS['work']
    const endTime = new Date(Date.now() + total * 1000).toISOString()
    const now = new Date().toISOString()
    endTimeRef.current = endTime
    pauseRemainingRef.current = null
    stateRef.current = 'running'

    const next: TimerData = {
      phase: 'work',
      state: 'running',
      remaining: total,
      totalSeconds: total,
      completedCount: dataRef.current.completedCount,
      taskName,
      taskId,
      area,
      startedAt: now,
      // Preserve urgent/memo across task starts. Only RESTART (reset) clears them.
      urgentItems: dataRef.current.urgentItems,
      memoItems: dataRef.current.memoItems,
    }
    setData(next)
    onSessionChange({ ...next, endTime, pauseRemaining: null })
  }, [onSessionChange])

  const pause = useCallback(() => {
    const rem = calcRemaining(endTimeRef.current, null)
    endTimeRef.current = null
    pauseRemainingRef.current = rem
    stateRef.current = 'paused'
    setData(prev => ({ ...prev, state: 'paused', remaining: rem }))
    onSessionChange({ state: 'paused', endTime: null, pauseRemaining: rem })
  }, [onSessionChange])

  const resume = useCallback(() => {
    const rem = pauseRemainingRef.current ?? dataRef.current.remaining
    const endTime = new Date(Date.now() + rem * 1000).toISOString()
    endTimeRef.current = endTime
    pauseRemainingRef.current = null
    stateRef.current = 'running'
    setData(prev => ({ ...prev, state: 'running', remaining: rem }))
    onSessionChange({ state: 'running', endTime, pauseRemaining: null })
  }, [onSessionChange])

  const reset = useCallback(() => {
    endTimeRef.current = null
    pauseRemainingRef.current = null
    stateRef.current = 'idle'
    const total = PHASE_DURATIONS['work']
    const next: TimerData = {
      ...dataRef.current,
      phase: 'work',
      state: 'idle',
      remaining: total,
      totalSeconds: total,
      startedAt: null,
      // RESTART explicitly clears urgent/memo (per user spec).
      urgentItems: [],
      memoItems: [],
    }
    setData(next)
    onSessionChange({ ...next, endTime: null, pauseRemaining: null, interruptions_urgent: [], interruptions_memo: [] } as any)
  }, [onSessionChange])

  /** Soft reset: end the current phase but KEEP urgentItems/memoItems, taskName, area.
   *  Used when a break completes — user returns to StartScreen with notes intact. */
  const softReset = useCallback(() => {
    endTimeRef.current = null
    pauseRemainingRef.current = null
    stateRef.current = 'idle'
    const total = PHASE_DURATIONS['work']
    const next: TimerData = {
      ...dataRef.current,
      phase: 'work',
      state: 'idle',
      remaining: total,
      totalSeconds: total,
      startedAt: null,
      // Preserve urgentItems and memoItems across break transitions.
    }
    setData(next)
    onSessionChange({ ...next, endTime: null, pauseRemaining: null } as any)
  }, [onSessionChange])

  /** Explicitly clear all interruption notes. Called only by PURGE button. */
  const clearInterruptions = useCallback(() => {
    setData(prev => {
      const updated = { ...prev, urgentItems: [], memoItems: [] }
      onSessionChange({ interruptions_urgent: [], interruptions_memo: [] } as any)
      return updated
    })
  }, [onSessionChange])

  const startNextPhase = useCallback((completedPomodoros: number) => {
    const isLongBreak = completedPomodoros % POMODOROS_BEFORE_LONG_BREAK === 0
    const phase: Phase = completedPomodoros === 0 ? 'work' : isLongBreak ? 'long-break' : 'short-break'
    const total = PHASE_DURATIONS[phase]
    const endTime = new Date(Date.now() + total * 1000).toISOString()
    endTimeRef.current = endTime
    pauseRemainingRef.current = null
    stateRef.current = 'running'
    setData(prev => ({
      ...prev,
      phase,
      state: 'running',
      remaining: total,
      totalSeconds: total,
      completedCount: completedPomodoros % POMODOROS_BEFORE_LONG_BREAK,
      startedAt: new Date().toISOString(),
    }))
    onSessionChange({ phase, state: 'running', endTime, pauseRemaining: null, totalSeconds: total })
  }, [onSessionChange])

  const skipBreak = useCallback(() => {
    startNextPhase(0)
  }, [startNextPhase])

  const addUrgent = useCallback((text: string) => {
    const item: Interruption = { id: crypto.randomUUID(), text, createdAt: new Date().toISOString() }
    setData(prev => {
      const updated = { ...prev, urgentItems: [...prev.urgentItems, item] }
      onSessionChange({ interruptions_urgent: updated.urgentItems } as any)
      return updated
    })
  }, [onSessionChange])

  const addMemo = useCallback((text: string) => {
    const item: Interruption = { id: crypto.randomUUID(), text, createdAt: new Date().toISOString() }
    setData(prev => {
      const updated = { ...prev, memoItems: [...prev.memoItems, item] }
      onSessionChange({ interruptions_memo: updated.memoItems } as any)
      return updated
    })
  }, [onSessionChange])

  return {
    data,
    start,
    pause,
    resume,
    reset,
    softReset,
    startNextPhase,
    skipBreak,
    addUrgent,
    addMemo,
    clearInterruptions,
    restoreSession,
  }
}
