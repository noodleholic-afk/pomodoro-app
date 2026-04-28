import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from './lib/supabase'
import { useTimer } from './hooks/useTimer'
import { useSupabase } from './hooks/useSupabase'
import { StartScreen } from './components/StartScreen'
import { Timer } from './components/Timer'
import { RecordScreen } from './components/RecordScreen'
import { Settings } from './components/Settings'
import type { Phase, RecordData, UserSettings, PomodoroSession } from './types'
import type { TimerData } from './hooks/useTimer'
import './styles/globals.css'

type Screen = 'start' | 'timer' | 'record' | 'settings'

function getURLParams() {
  const p = new URLSearchParams(window.location.search)
  return {
    task_id: p.get('task_id') || '',
    task_name: decodeURIComponent(p.get('task_name') || ''),
    area: decodeURIComponent(p.get('area') || ''),
  }
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

  // Visibility resync
  useEffect(() => {
    const handler = () => {
      if (!document.hidden && userId) {
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
    } else {
      timerRef.current?.startNextPhase(0)
      setScreen('timer')
    }
  }, [])

  const handleSessionChange = useCallback((delta: any) => {
    upsertSession(delta)
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

  function handleSkipRecord() {
    if (pendingRecord) {
      submitRecord({
        task_name: pendingRecord.taskName,
        task_id: pendingRecord.taskId || undefined,
        area: pendingRecord.area || undefined,
        duration: 25,
        started_at: pendingRecord.startedAt || new Date().toISOString(),
        interruptions_urgent: pendingRecord.urgentItems.map(i => i.text),
        interruptions_memo: pendingRecord.memoItems.map(i => i.text),
      })
    }
    timer.startNextPhase(completedPomodoros)
    setScreen('timer')
    setPendingRecord(null)
  }

  async function handleLogin(email: string, password: string) {
    // Try to sign up first (in case user doesn't exist)
    await supabase.auth.signUp({ email, password })

    // Then try to sign in (will succeed whether just signed up or already exists)
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })

    if (signInError) {
      throw signInError
    }
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
        onSkip={handleSkipRecord}
      />
    )
  }

  if (screen === 'timer' && timer.data.state !== 'idle') {
    return (
      <Timer
        data={timer.data}
        soundEnabled={soundEnabled}
        onPause={timer.pause}
        onResume={timer.resume}
        onReset={() => { timer.reset(); setScreen('start') }}
        onSkip={timer.skipBreak}
        onToggleSound={() => setSoundEnabled(v => !v)}
        onAddUrgent={timer.addUrgent}
        onAddMemo={timer.addMemo}
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
    />
  )
}
