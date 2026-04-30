import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from './lib/supabase'
import { useTimer } from './hooks/useTimer'
import { useSupabase } from './hooks/useSupabase'
import { StartScreen } from './components/StartScreen'
import { Timer } from './components/Timer'
import { BreakScreen } from './components/BreakScreen'
import { RecordScreen } from './components/RecordScreen'
import { Settings } from './components/Settings'
import { unlockAudioContext } from './lib/audio'
import type { Phase, RecordData, UserSettings, PomodoroSession } from './types'
import type { TimerData } from './hooks/useTimer'
import './styles/globals.css'

type Screen = 'start' | 'timer' | 'record' | 'settings'

const LS_KEY = 'pomo_local_session'

function getURLParams() {
  const p = new URLSearchParams(window.location.search)
  return {
    task_id: p.get('task_id') || '',
    task_name: decodeURIComponent(p.get('task_name') || ''),
    area: decodeURIComponent(p.get('area') || ''),
  }
}

/** Map camelCase TimerData delta to snake_case PomodoroSession columns */
function toSessionRow(delta: any): Partial<PomodoroSession> {
  const row: any = {}
  if (delta.phase             !== undefined) row.phase               = delta.phase
  if (delta.totalSeconds      !== undefined) row.total_seconds       = delta.totalSeconds
  if (delta.total_seconds     !== undefined) row.total_seconds       = delta.total_seconds
  if (delta.completedCount    !== undefined) row.completed_count     = delta.completedCount
  if (delta.completed_count   !== undefined) row.completed_count     = delta.completed_count
  if (delta.taskName          !== undefined) row.task_name           = delta.taskName
  if (delta.task_name         !== undefined) row.task_name           = delta.task_name
  if (delta.taskId            !== undefined) row.task_id             = delta.taskId
  if (delta.task_id           !== undefined) row.task_id             = delta.task_id
  if (delta.area              !== undefined) row.area                = delta.area
  if (delta.startedAt         !== undefined) row.started_at          = delta.startedAt
  if (delta.started_at        !== undefined) row.started_at          = delta.started_at
  if (delta.urgentItems       !== undefined) row.interruptions_urgent = delta.urgentItems
  if (delta.memoItems         !== undefined) row.interruptions_memo   = delta.memoItems
  if (delta.interruptions_urgent !== undefined) row.interruptions_urgent = delta.interruptions_urgent
  if (delta.interruptions_memo   !== undefined) row.interruptions_memo   = delta.interruptions_memo
  if (delta.endTime           !== undefined) row.end_time            = delta.endTime
  if (delta.end_time          !== undefined) row.end_time            = delta.end_time
  if (delta.pauseRemaining    !== undefined) row.pause_remaining     = delta.pauseRemaining
  if (delta.pause_remaining   !== undefined) row.pause_remaining     = delta.pause_remaining
  return row
}

function saveLocal(data: TimerData, endTime: string | null, pauseRemaining: number | null, completedPomodoros: number) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({
      phase: data.phase, totalSeconds: data.totalSeconds,
      endTime, pauseRemaining, completedCount: data.completedCount,
      completedPomodoros,
      taskName: data.taskName, taskId: data.taskId, area: data.area,
      startedAt: data.startedAt,
      urgentItems: data.urgentItems, memoItems: data.memoItems,
      ts: Date.now(),
    }))
  } catch { /* quota */ }
}

function clearLocal() { localStorage.removeItem(LS_KEY) }

function loadLocal(): any | null {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return null
    const d = JSON.parse(raw)
    if (Date.now() - d.ts > 2 * 60 * 60 * 1000) { clearLocal(); return null }
    return d
  } catch { return null }
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('start')
  const [userId, setUserId] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [userSettings, setUserSettings] = useState<Partial<UserSettings>>({})
  const [completedPomodoros, setCompletedPomodoros] = useState(0)
  const [pendingRecord, setPendingRecord] = useState<TimerData | null>(null)

  const timerRef          = useRef<ReturnType<typeof useTimer> | null>(null)
  const completedRef      = useRef(0)
  const screenRef         = useRef<Screen>('start')   // 鈫?tracks current screen for callbacks
  const upsertSessionRef  = useRef<((s: any) => void) | null>(null)

  // Keep refs in sync
  completedRef.current = completedPomodoros
  screenRef.current    = screen

  const urlParams = getURLParams()

  // Auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUserId(data.session?.user.id || null)
      setUserEmail(data.session?.user.email || null)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user.id || null)
      setUserEmail(session?.user.email || null)
    })
    return () => subscription.unsubscribe()
  }, [])

  // Re-unlock AudioContext on every user interaction (iOS Safari).
  // iOS can re-suspend the AudioContext after lock-screen / background.
  // unlockAudioContext() is a no-op when ctx.state === 'running', so this is cheap.
  useEffect(() => {
    const handler = () => { unlockAudioContext() }
    document.addEventListener('touchstart', handler, { capture: true, passive: true })
    document.addEventListener('click',      handler, { capture: true })
    return () => {
      document.removeEventListener('touchstart', handler, true)
      document.removeEventListener('click',      handler, true)
    }
  }, [])

  // Request notification permission for lock-screen alarms.
  // Web Audio is silenced when screen is locked; Notification API works reliably.
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {/* ignore */})
    }
  }, [])

  /**
   * Remote session handler.
   * Guard: if we're currently on record/settings, DON'T override screen or restore timer
   * (prevents self-triggered Realtime updates from interrupting the record flow).
   */
  const handleRemoteSession = useCallback((session: PomodoroSession) => {
    const cur = screenRef.current
    if (cur === 'record' || cur === 'settings') return   // 鈫?KEY FIX

    timerRef.current?.restoreSession({
      phase: session.phase as Phase,
      total_seconds: session.total_seconds,
      end_time: session.end_time,
      pause_remaining: session.pause_remaining,
      completed_count: session.completed_count,
      task_name: session.task_name,
      task_id: session.task_id,
      area: session.area,
      interruptions_urgent: session.interruptions_urgent || [],
      interruptions_memo: session.interruptions_memo || [],
      started_at: session.started_at,
    })
    if (session.completed_count !== undefined) {
      setCompletedPomodoros(session.completed_count)
    }
    if (session.end_time || session.pause_remaining !== null) {
      setScreen('timer')
    }
  }, [])

  const { upsertSession, fetchSession, fetchSettings, upsertSettings } = useSupabase(userId, handleRemoteSession)
  upsertSessionRef.current = upsertSession

  function applySession(session: PomodoroSession) {
    timerRef.current?.restoreSession({
      phase: session.phase as Phase,
      total_seconds: session.total_seconds,
      end_time: session.end_time,
      pause_remaining: session.pause_remaining,
      completed_count: session.completed_count,
      task_name: session.task_name,
      task_id: session.task_id,
      area: session.area,
      interruptions_urgent: session.interruptions_urgent || [],
      interruptions_memo: session.interruptions_memo || [],
      started_at: session.started_at,
    })
    if (session.completed_count !== undefined) {
      setCompletedPomodoros(session.completed_count)
    }
  }

  // Load settings + restore session on login
  useEffect(() => {
    if (!userId) return
    fetchSettings().then(s => {
      if (s) { setUserSettings(s); setSoundEnabled(s.sound_enabled ?? true) }
    })
    fetchSession().then(s => {
      if (s && (s.end_time || s.pause_remaining !== null)) {
        applySession(s)
        setScreen('timer')
      }
    })
  }, [userId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Sync completedPomodoros to Supabase (other devices get it)
  // Use a timeout so it doesn't fire during phase-transition renders
  useEffect(() => {
    if (!userId) return
    const t = setTimeout(() => {
      upsertSessionRef.current?.({ completed_count: completedPomodoros } as any)
    }, 300)
    return () => clearTimeout(t)
  }, [completedPomodoros, userId])

  // On mount: restore from localStorage (works without login, survives lock screen)
  useEffect(() => {
    const local = loadLocal()
    if (local && (local.endTime || local.pauseRemaining !== null)) {
      timerRef.current?.restoreSession({
        phase: local.phase, total_seconds: local.totalSeconds,
        end_time: local.endTime, pause_remaining: local.pauseRemaining,
        completed_count: local.completedCount,
        task_name: local.taskName, task_id: local.taskId, area: local.area,
        interruptions_urgent: local.urgentItems || [],
        interruptions_memo: local.memoItems || [],
        started_at: local.startedAt,
      })
      if (local.completedPomodoros !== undefined) setCompletedPomodoros(local.completedPomodoros)
      setScreen('timer')
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Visibility change: restore from localStorage first, then Supabase
  useEffect(() => {
    const handler = () => {
      if (document.hidden) return
      if (screenRef.current === 'record' || screenRef.current === 'settings') return
      const local = loadLocal()
      if (local && (local.endTime || local.pauseRemaining !== null)) {
        timerRef.current?.restoreSession({
          phase: local.phase, total_seconds: local.totalSeconds,
          end_time: local.endTime, pause_remaining: local.pauseRemaining,
          completed_count: local.completedCount,
          task_name: local.taskName, task_id: local.taskId, area: local.area,
          interruptions_urgent: local.urgentItems || [],
          interruptions_memo: local.memoItems || [],
          started_at: local.startedAt,
        })
        if (local.completedPomodoros !== undefined) setCompletedPomodoros(local.completedPomodoros)
        setScreen('timer')
      }
      if (userId) fetchSession().then(s => { if (s) applySession(s) })
    }
    document.addEventListener('visibilitychange', handler)
    return () => document.removeEventListener('visibilitychange', handler)
  }, [userId]) // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Work completes 鈫?go to Record.
   * Immediately clear end_time in Supabase so Realtime bounce-backs
   * don't think there's an active timer and override the screen.
   */
  const handlePhaseComplete = useCallback((phase: Phase, data: TimerData) => {
    if (phase === 'work') {
      setCompletedPomodoros(n => n + 1)
      setPendingRecord({ ...data })
      setScreen('record')
      clearLocal()
      // Clear end_time so self-triggered Realtime won't pull back to timer
      upsertSessionRef.current?.({ end_time: null, pause_remaining: null } as any)
      // Notify user (works even when screen is locked)
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('🍅 番茄完成！', { body: '去记录吧' })
      }
    } else {
      // Break done 鈫?reset and go to StartScreen to re-select task
      timerRef.current?.reset()
      setScreen('start')
      clearLocal()
      // Notify user
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('☕ 休息结束！', { body: '准备下一个番茄' })
      }
    }
  }, [])

  const handleSessionChange = useCallback((delta: any) => {
    const row = toSessionRow(delta)
    upsertSessionRef.current?.(row)
    if (timerRef.current) {
      saveLocal(
        timerRef.current.data,
        delta.endTime ?? delta.end_time ?? null,
        delta.pauseRemaining ?? delta.pause_remaining ?? null,
        completedRef.current,
      )
    }
  }, [])

  const timer = useTimer({
    soundEnabled,
    onPhaseComplete: handlePhaseComplete,
    onSessionChange: handleSessionChange,
  })
  timerRef.current = timer

  async function submitRecord(record: RecordData) {
    try {
      await supabase.functions.invoke('notion-write', { body: record })
    } catch {
      const queue: RecordData[] = JSON.parse(localStorage.getItem('notion_queue') || '[]')
      queue.push(record)
      localStorage.setItem('notion_queue', JSON.stringify(queue))
    }
  }

  useEffect(() => {
    async function retryQueue() {
      const queue: RecordData[] = JSON.parse(localStorage.getItem('notion_queue') || '[]')
      if (!queue.length) return
      const remaining: RecordData[] = []
      for (const r of queue) {
        try { await supabase.functions.invoke('notion-write', { body: r }) }
        catch { remaining.push(r) }
      }
      localStorage.setItem('notion_queue', JSON.stringify(remaining))
    }
    window.addEventListener('online', retryQueue)
    return () => window.removeEventListener('online', retryQueue)
  }, [])

  function handleStart(taskName: string, taskId: string, area: string) {
    unlockAudioContext()
    timer.start(taskName, taskId, area)
    setScreen('timer')
    if (urlParams.task_name) window.history.replaceState({}, '', '/')
  }

  // SUBMIT on RecordScreen 鈫?start break phase
  function handleRecord(record: RecordData) {
    submitRecord(record)
    timer.startNextPhase(completedPomodoros)
    setScreen('timer')
    setPendingRecord(null)
  }

  // RESTART on RecordScreen 鈫?undo last count, back to start
  function handleBackFromRecord() {
    setCompletedPomodoros(n => Math.max(0, n - 1))
    timer.reset()
    setScreen('start')
    setPendingRecord(null)
    clearLocal()
  }

  // SKIP work phase (debug) 鈫?go to record immediately
  function handleSkipWork() {
    // Clear end_time first so Realtime doesn't bounce back
    upsertSessionRef.current?.({ end_time: null, pause_remaining: null } as any)
    setCompletedPomodoros(n => n + 1)
    setPendingRecord({ ...timer.data })
    setScreen('record')
    clearLocal()
  }

  // SKIP break 鈫?reset and re-select task
  function handleSkipBreak() {
    timer.reset()
    setScreen('start')
    clearLocal()
  }

  async function handleLogin(email: string, password: string) {
    await supabase.auth.signUp({ email, password })
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  async function handleLogout() { await supabase.auth.signOut() }

  async function handleSaveSettings(s: Partial<UserSettings>) {
    setUserSettings(prev => ({ ...prev, ...s }))
    if (s.sound_enabled !== undefined) setSoundEnabled(s.sound_enabled)
    await upsertSettings(s)
    setScreen(timer.data.state === 'idle' ? 'start' : 'timer')
  }

  // 鈹€鈹€ Routing 鈹€鈹€

  if (screen === 'settings') {
    return (
      <Settings
        settings={userSettings}
        onSave={handleSaveSettings}
        onBack={() => setScreen(timer.data.state === 'idle' ? 'start' : 'timer')}
        isLoggedIn={!!userId}
        userEmail={userEmail}
        onLogin={handleLogin}
        onLogout={handleLogout}
      />
    )
  }

  if (screen === 'record' && pendingRecord) {
    return (
      <RecordScreen
        timerData={pendingRecord}
        completedPomodoros={completedPomodoros}
        onSubmit={handleRecord}
        onBack={handleBackFromRecord}
      />
    )
  }

  if (screen === 'timer' && timer.data.state !== 'idle' && timer.data.phase === 'work') {
    return (
      <Timer
        data={timer.data}
        soundEnabled={soundEnabled}
        completedPomodoros={completedPomodoros}
        onPause={timer.pause}
        onResume={timer.resume}
        onReset={() => { timer.reset(); setScreen('start'); clearLocal() }}
        onSkip={handleSkipWork}
        onToggleSound={() => setSoundEnabled(v => !v)}
        onAddUrgent={timer.addUrgent}
        onAddMemo={timer.addMemo}
        onPurge={timer.clearInterruptions}
      />
    )
  }

  if (screen === 'timer' && timer.data.state !== 'idle' && timer.data.phase !== 'work') {
    return (
      <BreakScreen
        data={timer.data}
        soundEnabled={soundEnabled}
        completedPomodoros={completedPomodoros}
        onPause={timer.pause}
        onResume={timer.resume}
        onSkip={handleSkipBreak}
        onToggleSound={() => setSoundEnabled(v => !v)}
      />
    )
  }

  return (
    <StartScreen
      prefillTask={urlParams.task_name}
      prefillArea={urlParams.area}
      prefillTaskId={urlParams.task_id}
      onStart={handleStart}
      onOpenSettings={() => setScreen('settings')}
      completedPomodoros={completedPomodoros}
      isLoggedIn={!!userId}
    />
  )
}
