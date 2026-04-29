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

/** Map TimerData + extras to snake_case PomodoroSession fields for Supabase */
function toSessionRow(delta: any): Partial<PomodoroSession> {
  const row: any = {}
  if (delta.phase !== undefined)          row.phase = delta.phase
  if (delta.totalSeconds !== undefined)   row.total_seconds = delta.totalSeconds
  if (delta.completedCount !== undefined) row.completed_count = delta.completedCount
  if (delta.taskName !== undefined)       row.task_name = delta.taskName
  if (delta.taskId !== undefined)         row.task_id = delta.taskId
  if (delta.area !== undefined)           row.area = delta.area
  if (delta.startedAt !== undefined)      row.started_at = delta.startedAt
  if (delta.urgentItems !== undefined)    row.interruptions_urgent = delta.urgentItems
  if (delta.memoItems !== undefined)      row.interruptions_memo = delta.memoItems
  // These are already snake_case from useTimer
  if (delta.endTime !== undefined)        row.end_time = delta.endTime
  if (delta.pauseRemaining !== undefined) row.pause_remaining = delta.pauseRemaining
  if (delta.end_time !== undefined)       row.end_time = delta.end_time
  if (delta.pause_remaining !== undefined)row.pause_remaining = delta.pause_remaining
  if (delta.total_seconds !== undefined)  row.total_seconds = delta.total_seconds
  if (delta.completed_count !== undefined)row.completed_count = delta.completed_count
  if (delta.task_name !== undefined)      row.task_name = delta.task_name
  if (delta.task_id !== undefined)        row.task_id = delta.task_id
  if (delta.started_at !== undefined)     row.started_at = delta.started_at
  if (delta.interruptions_urgent !== undefined) row.interruptions_urgent = delta.interruptions_urgent
  if (delta.interruptions_memo !== undefined)   row.interruptions_memo = delta.interruptions_memo
  return row
}

/** Save critical timer state to localStorage so it survives lock-screen / reload */
function saveLocal(data: TimerData, endTime: string | null, pauseRemaining: number | null) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({
      phase: data.phase,
      totalSeconds: data.totalSeconds,
      endTime,
      pauseRemaining,
      completedCount: data.completedCount,
      taskName: data.taskName,
      taskId: data.taskId,
      area: data.area,
      startedAt: data.startedAt,
      urgentItems: data.urgentItems,
      memoItems: data.memoItems,
      screen: 'timer',
      ts: Date.now(),
    }))
  } catch { /* quota */ }
}

function loadLocal(): any | null {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return null
    const d = JSON.parse(raw)
    // Expire after 2 hours
    if (Date.now() - d.ts > 2 * 60 * 60 * 1000) {
      localStorage.removeItem(LS_KEY)
      return null
    }
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
  const timerRef = useRef<ReturnType<typeof useTimer> | null>(null)

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

  // Unlock audio on first user interaction (iOS requirement)
  useEffect(() => {
    const handler = () => {
      unlockAudioContext()
      document.removeEventListener('touchstart', handler, true)
      document.removeEventListener('click', handler, true)
    }
    document.addEventListener('touchstart', handler, { capture: true, once: true })
    document.addEventListener('click', handler, { capture: true, once: true })
    return () => {
      document.removeEventListener('touchstart', handler, true)
      document.removeEventListener('click', handler, true)
    }
  }, [])

  const handleRemoteSession = useCallback((session: PomodoroSession) => {
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
    // Also switch screen if remote indicates active session
    if (session.end_time || session.pause_remaining !== null) {
      setScreen('timer')
    }
  }, [])

  const { upsertSession, fetchSession, fetchSettings, upsertSettings } = useSupabase(userId, handleRemoteSession)

  const restoreFromSession = useCallback((session: PomodoroSession) => {
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
  }, [])

  // Load settings on login
  useEffect(() => {
    if (!userId) return
    fetchSettings().then(s => {
      if (s) {
        setUserSettings(s)
        setSoundEnabled(s.sound_enabled ?? true)
      }
    })
    fetchSession().then(s => {
      if (s && (s.end_time || s.pause_remaining !== null)) {
        restoreFromSession(s)
        setScreen('timer')
      }
    })
  }, [userId]) // eslint-disable-line react-hooks/exhaustive-deps

  // On mount: try localStorage restore (works even without login — fixes lock screen)
  useEffect(() => {
    const local = loadLocal()
    if (local && local.endTime) {
      timerRef.current?.restoreSession({
        phase: local.phase,
        total_seconds: local.totalSeconds,
        end_time: local.endTime,
        pause_remaining: local.pauseRemaining,
        completed_count: local.completedCount,
        task_name: local.taskName,
        task_id: local.taskId,
        area: local.area,
        interruptions_urgent: local.urgentItems || [],
        interruptions_memo: local.memoItems || [],
        started_at: local.startedAt,
      })
      setScreen('timer')
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Visibility resync
  useEffect(() => {
    const handler = () => {
      if (document.hidden) return
      // Restore from localStorage first (instant, works offline)
      const local = loadLocal()
      if (local && (local.endTime || local.pauseRemaining !== null)) {
        timerRef.current?.restoreSession({
          phase: local.phase,
          total_seconds: local.totalSeconds,
          end_time: local.endTime,
          pause_remaining: local.pauseRemaining,
          completed_count: local.completedCount,
          task_name: local.taskName,
          task_id: local.taskId,
          area: local.area,
          interruptions_urgent: local.urgentItems || [],
          interruptions_memo: local.memoItems || [],
          started_at: local.startedAt,
        })
        setScreen('timer')
      }
      // Then also fetch from Supabase if logged in (authoritative sync)
      if (userId) {
        fetchSession().then(s => { if (s) restoreFromSession(s) })
      }
    }
    document.addEventListener('visibilitychange', handler)
    return () => document.removeEventListener('visibilitychange', handler)
  }, [userId, fetchSession, restoreFromSession])

  const handlePhaseComplete = useCallback((phase: Phase, data: TimerData) => {
    if (phase === 'work') {
      setCompletedPomodoros(n => n + 1)
      setPendingRecord({ ...data })
      setScreen('record')
      localStorage.removeItem(LS_KEY)
    } else {
      timerRef.current?.startNextPhase(0)
      setScreen('timer')
    }
  }, [])

  const handleSessionChange = useCallback((delta: any) => {
    const row = toSessionRow(delta)
    upsertSession(row)
    // Also persist to localStorage for lock-screen survival
    if (timerRef.current) {
      saveLocal(
        timerRef.current.data,
        delta.endTime ?? delta.end_time ?? null,
        delta.pauseRemaining ?? delta.pause_remaining ?? null
      )
    }
  }, [upsertSession])

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

  async function retryQueue() {
    const queue: RecordData[] = JSON.parse(localStorage.getItem('notion_queue') || '[]')
    if (!queue.length) return
    const remaining: RecordData[] = []
    for (const record of queue) {
      try {
        await supabase.functions.invoke('notion-write', { body: record })
      } catch {
        remaining.push(record)
      }
    }
    localStorage.setItem('notion_queue', JSON.stringify(remaining))
  }

  useEffect(() => {
    window.addEventListener('online', retryQueue)
    return () => window.removeEventListener('online', retryQueue)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function handleStart(taskName: string, taskId: string, area: string) {
    unlockAudioContext()
    timer.start(taskName, taskId, area)
    setScreen('timer')
    if (urlParams.task_name) window.history.replaceState({}, '', '/')
  }

  function handleRecord(record: RecordData) {
    submitRecord(record)
    timer.startNextPhase(completedPomodoros)
    setScreen('timer')
    setPendingRecord(null)
  }

  function handleBackFromRecord() {
    setCompletedPomodoros(n => Math.max(0, n - 1))
    timer.reset()
    setScreen('start')
    setPendingRecord(null)
    localStorage.removeItem(LS_KEY)
  }

  async function handleLogin(email: string, password: string) {
    await supabase.auth.signUp({ email, password })
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (signInError) throw signInError
  }

  async function handleLogout() {
    await supabase.auth.signOut()
  }

  async function handleSaveSettings(s: Partial<UserSettings>) {
    setUserSettings(prev => ({ ...prev, ...s }))
    if (s.sound_enabled !== undefined) setSoundEnabled(s.sound_enabled)
    await upsertSettings(s)
    setScreen(timer.data.state === 'idle' ? 'start' : 'timer')
  }

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
        onReset={() => { timer.reset(); setScreen('start'); localStorage.removeItem(LS_KEY) }}
        onToggleSound={() => setSoundEnabled(v => !v)}
        onAddUrgent={timer.addUrgent}
        onAddMemo={timer.addMemo}
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
        onSkip={timer.skipBreak}
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
    />
  )
}
