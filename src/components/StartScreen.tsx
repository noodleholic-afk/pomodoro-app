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
  { id: '求职',  emoji: '🔍', label: '求职' },
  { id: '身心',  emoji: '💚', label: '身心' },
  { id: '人生OS',emoji: '🪢', label: '人生OS' },
  { id: '兼职',  emoji: '🏪', label: '兼职' },
  { id: '财务',  emoji: '💰', label: '财务' },
  { id: '生活',  emoji: '🏠', label: '生活' },
  { id: '兴趣',  emoji: '💃', label: '兴趣' },
  { id: '关系',  emoji: '👥', label: '关系' },
  { id: '其他',  emoji: '📦', label: '其他', full: true },
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
        ...FONT,
      }}
    >

      {/* ─── Header bar ─── */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-base">🍅</span>
          <span className="text-white/60 text-xs">POMO</span>
        </div>
        <div className="flex items-center gap-3">
          {completedPomodoros > 0 && (
            <span className="text-white/40 text-xs">#{completedPomodoros}</span>
          )}
          <button onClick={onOpenSettings} className="px-btn text-white/40 hover:text-white text-base">⚙</button>
        </div>
      </div>

      <div className="flex-1 flex flex-col px-4 pb-6 gap-4 overflow-y-auto max-w-md mx-auto w-full">

        {/* ─── Area grid ─── */}
        <div className="rounded-lg border border-white/10 p-3" style={C}>
          <p className="text-white/40 text-xs mb-2" style={FONT}>领域</p>
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
                  fontSize: 10, cursor: 'pointer', transition: 'all 0.15s',
                }}
                className="px-btn"
              >
                {area.emoji} {area.label}
              </button>
            ))}
          </div>
        </div>

        {/* ─── Notion tasks ─── */}
        <div className="rounded-lg border border-white/10 p-3" style={C}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-white/40 text-xs" style={FONT}>Notion 任务</p>
            {isLoggedIn && (
              <button onClick={fetchTasks} className="px-btn text-white/25 text-xs" style={FONT}>↻</button>
            )}
          </div>
          {!isLoggedIn ? (
            <p className="text-white/20 text-xs py-1" style={FONT}>⚙ 登录后显示</p>
          ) : loading ? (
            <p className="text-white/25 text-xs py-1" style={FONT}>载入中...</p>
          ) : tasks.length === 0 ? (
            <p className="text-white/20 text-xs py-1" style={FONT}>无进行中任务（检查 Settings → Notion Token）</p>
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
                  {task.area && <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 9, marginTop: 2 }}>{task.area}</div>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ─── Manual input + AI button ─── */}
        <div className="rounded-lg border border-white/10 p-3" style={C}>
          <div className="flex gap-2">
            <input
              className="flex-1 px-3 py-2 text-white text-xs"
              style={{ ...FONT, borderRadius: 6, border: '2px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.06)' }}
              placeholder="手动输入任务名称..."
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
              title="AI 识别"
            >
              {aiLoading ? '...' : '✨'}
            </button>
          </div>
        </div>

        {/* ─── START ─── */}
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
          ▶ START
        </button>
      </div>
    </div>
  )
}
