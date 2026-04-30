import { useState, useEffect } from 'react'
import { useNotionTasks } from '../hooks/useNotionTasks'
import { supabase } from '../lib/supabase'

interface Props {
  prefillTask?: string
  prefillArea?: string
  prefillTaskId?: string
  onStart: (taskName: string, taskId: string, area: string) => void
  onOpenSettings: () => void
  completedPomodoros: number
  isLoggedIn?: boolean
}

const AREAS = [
  { id: '姹傝亴',  emoji: '馃攳', label: '姹傝亴' },
  { id: '韬績',  emoji: '馃挌', label: '韬績' },
  { id: '浜虹敓OS',emoji: '馃', label: '浜虹敓OS' },
  { id: '鍏艰亴',  emoji: '馃彧', label: '鍏艰亴' },
  { id: '璐㈠姟',  emoji: '馃挵', label: '璐㈠姟' },
  { id: '鐢熸椿',  emoji: '馃彔', label: '鐢熸椿' },
  { id: '鍏磋叮',  emoji: '馃拑', label: '鍏磋叮' },
  { id: '鍏崇郴',  emoji: '馃懃', label: '鍏崇郴' },
  { id: '鍏朵粬',  emoji: '馃摝', label: '鍏朵粬', full: true },
] as const

const FONT = { fontFamily: 'var(--font)' }
const C = { background: 'var(--card)' }

export function StartScreen({ prefillTask, prefillArea, prefillTaskId, onStart, onOpenSettings, completedPomodoros, isLoggedIn }: Props) {
  const [taskName,     setTaskName]     = useState(prefillTask    || '')
  const [taskId,       setTaskId]       = useState(prefillTaskId  || '')
  const [selectedArea, setSelectedArea] = useState(prefillArea    || '')
  const [aiLoading,    setAiLoading]    = useState(false)

  const { tasks, loading, fetchTasks } = useNotionTasks()

  useEffect(() => { fetchTasks() }, [])

  const canStart = taskName.trim().length > 0

  function selectTask(task: { id: string; name: string; area: string }) {
    setTaskName(task.name)
    setTaskId(task.id)
    // Try to auto-select area button
    const match = AREAS.find(a => task.area.includes(a.label) || task.area.includes(a.emoji))
    if (match) setSelectedArea(match.label)
    else if (task.area) setSelectedArea(task.area)
  }

  function toggleArea(label: string) {
    setSelectedArea(prev => prev === label ? '' : label)
  }

  async function handleAI() {
    const text = taskName.trim()
    if (!text || aiLoading) return
    setAiLoading(true)
    try {
      const { data } = await supabase.functions.invoke('ai-parse', { body: { text } })
      if (data?.task_name) setTaskName(data.task_name)
    } catch { /* silent */ } finally {
      setAiLoading(false)
    }
  }

  function handleStart() {
    if (!canStart) return
    const areaStr = AREAS.find(a => a.label === selectedArea)
      ? `${AREAS.find(a => a.label === selectedArea)!.emoji} ${selectedArea}`
      : selectedArea
    onStart(taskName.trim(), taskId, areaStr)
    if (prefillTask) window.history.replaceState({}, '', '/')
  }

  return (
    <div
      className="pixel-grid page-fade"
      style={{
        height: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg)',
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        overflow: 'hidden',
        boxSizing: 'border-box',
        ...FONT,
      }}
    >

      {/* 鈹€鈹€鈹€ Header bar 鈹€鈹€鈹€ */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-base">馃崊</span>
          <span className="text-white/60 text-xs">POMO</span>
        </div>
        <div className="flex items-center gap-3">
          {completedPomodoros > 0 && (
            <span className="text-white/40 text-xs">#{completedPomodoros}</span>
          )}
          <button onClick={onOpenSettings} className="px-btn text-white/40 hover:text-white text-base">鈿?/button>
        </div>
      </div>

      <div className="flex flex-col px-4 gap-4 max-w-md mx-auto w-full" style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>

        {/* 鈹€鈹€鈹€ Area grid 鈹€鈹€鈹€ */}
        <div className="rounded-lg border border-white/10 p-3" style={C}>
          <p className="text-white/40 text-xs mb-2" style={FONT}>棰嗗煙</p>
          <div className="grid grid-cols-2 gap-1.5">
            {AREAS.map(area => (
              <button
                key={area.id}
                onClick={() => toggleArea(area.label)}
                style={{
                  ...FONT,
                  gridColumn: 'full' in area ? '1 / -1' : undefined,
                  background: selectedArea === area.label ? 'var(--work-lo)' : 'rgba(255,255,255,0.04)',
                  border: `2px solid ${selectedArea === area.label ? 'var(--work-hi)' : 'rgba(255,255,255,0.12)'}`,
                  color: selectedArea === area.label ? '#ff8888' : 'rgba(255,255,255,0.65)',
                  borderRadius: 6, padding: '8px 10px', textAlign: 'left',
                  fontSize: 14, cursor: 'pointer', transition: 'all 0.15s',
                }}
                className="px-btn"
              >
                {area.emoji} {area.label}
              </button>
            ))}
          </div>
        </div>

        {/* 鈹€鈹€鈹€ Notion tasks 鈹€鈹€鈹€ */}
        <div className="rounded-lg border border-white/10 p-3" style={C}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-white/40 text-xs" style={FONT}>Notion 浠诲姟</p>
            {isLoggedIn && (
              <button onClick={fetchTasks} className="px-btn text-white/25 text-xs" style={FONT}>鈫?/button>
            )}
          </div>
          {!isLoggedIn ? (
            <p className="text-white/20 text-xs py-1" style={FONT}>鈿?鐧诲綍鍚庢樉绀?/p>
          ) : loading ? (
            <p className="text-white/25 text-xs py-1" style={FONT}>杞藉叆涓?..</p>
          ) : tasks.length === 0 ? (
            <p className="text-white/20 text-xs py-1" style={FONT}>鏃犺繘琛屼腑浠诲姟锛堟鏌?Settings 鈫?Notion Token锛?/p>
          ) : (
            <div className="space-y-1.5">
              {tasks.map(task => (
                <button
                  key={task.id}
                  onClick={() => selectTask(task)}
                  className="px-btn w-full text-left px-3 py-2 text-xs"
                  style={{
                    ...FONT,
                    background: taskId === task.id ? 'var(--work-lo)' : 'rgba(255,255,255,0.04)',
                    border: `2px solid ${taskId === task.id ? 'var(--work-border)' : 'rgba(255,255,255,0.1)'}`,
                    color: taskId === task.id ? '#ffaaaa' : 'rgba(255,255,255,0.7)',
                    borderRadius: 6,
                  }}
                >
                  <div className="truncate">{task.name}</div>
                  {task.area && <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, marginTop: 2 }}>{task.area}</div>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 鈹€鈹€鈹€ Manual input + AI button 鈹€鈹€鈹€ */}
        <div className="rounded-lg border border-white/10 p-3" style={C}>
          <div className="flex gap-2">
            <input
              className="flex-1 px-3 py-2 text-white text-xs"
              style={{ ...FONT, borderRadius: 6, border: '2px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.06)' }}
              placeholder="鎵嬪姩杈撳叆浠诲姟鍚嶇О..."
              value={taskName}
              onChange={e => { setTaskName(e.target.value); setTaskId('') }}
              onKeyDown={e => e.key === 'Enter' && canStart && handleStart()}
              autoFocus
            />
            <button
              onClick={handleAI}
              disabled={!taskName.trim() || aiLoading}
              className="px-btn px-3 py-2 text-base"
              style={{ border: '2px solid rgba(255,255,255,0.2)', borderRadius: 6, background: 'rgba(255,255,255,0.06)' }}
              title="AI 璇嗗埆"
            >
              {aiLoading ? '...' : '鉁?}
            </button>
          </div>
        </div>

        {/* 鈹€鈹€鈹€ START 鈹€鈹€鈹€ */}
        <button
          onClick={handleStart}
          disabled={!canStart}
          className="px-btn w-full py-4 text-sm tracking-widest"
          style={{
            ...FONT,
            border: `3px solid ${canStart ? 'var(--work-hi)' : 'rgba(255,255,255,0.15)'}`,
            background: canStart ? 'var(--work-lo)' : 'transparent',
            color: canStart ? '#ff8888' : 'rgba(255,255,255,0.2)',
            borderRadius: 8,
            boxShadow: canStart ? '0 0 12px rgba(204,68,68,0.3)' : 'none',
          }}
        >
          鈻?START
        </button>
      </div>
    </div>
  )
}
