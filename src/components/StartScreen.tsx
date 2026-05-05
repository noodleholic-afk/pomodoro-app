import { useState, useEffect } from 'react'
import { useNotionTasks } from '../hooks/useNotionTasks'

interface TodayTask {
  id: string
  text: string
  done: boolean
}

interface Props {
  prefillTask?: string
  prefillArea?: string
  prefillTaskId?: string
  onStart: (taskName: string, taskId: string, area: string) => void
  onOpenSettings: () => void
  completedPomodoros: number
  isLoggedIn?: boolean
  urgentItems?: { id: string; text: string }[]
  memoItems?: { id: string; text: string }[]
}

const AREAS = [
  { id: '求职',   emoji: '🔍', label: '求职' },
  { id: '身心',   emoji: '💚', label: '身心' },
  { id: '人生OS', emoji: '🪢', label: '人生OS' },
  { id: '兼职',   emoji: '🏪', label: '兼职' },
  { id: '财务',   emoji: '💰', label: '财务' },
  { id: '生活',   emoji: '🏠', label: '生活' },
  { id: '兴趣',   emoji: '💃', label: '兴趣' },
  { id: '关系',   emoji: '👥', label: '关系' },
  { id: '其他',   emoji: '📦', label: '其他', full: true },
] as const

const EM: React.CSSProperties = { fontFamily: 'system-ui, -apple-system, sans-serif' }

const TODAY_KEY = 'today_tasks'
const FONT = { fontFamily: 'var(--font)' }
const C = { background: 'var(--card)' }
const CARD_STYLE = {
  borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', padding: 12, ...C,
}

function loadTodayTasks(): TodayTask[] {
  try { return JSON.parse(localStorage.getItem(TODAY_KEY) || '[]') } catch { return [] }
}
function saveTodayTasks(tasks: TodayTask[]) {
  try { localStorage.setItem(TODAY_KEY, JSON.stringify(tasks)) } catch {}
}

export function StartScreen({
  prefillTask, prefillArea, prefillTaskId,
  onStart, onOpenSettings, completedPomodoros, isLoggedIn,
  urgentItems = [], memoItems = [],
}: Props) {
  // Normalize prefillArea: "🔍 求职" → "求职" (extract label for AREAS matching)
  const normalizedPrefillArea = prefillArea
    ? (AREAS.find(a => prefillArea.includes(a.label))?.label || prefillArea)
    : ''

  const [taskName,     setTaskName]     = useState(prefillTask   || '')
  const [taskId,       setTaskId]       = useState(prefillTaskId || '')
  const [selectedArea, setSelectedArea] = useState(normalizedPrefillArea)

  // TODAY'S TASKS
  const [todayTasks,  setTodayTasks]   = useState<TodayTask[]>(loadTodayTasks)
  const [todayInput,  setTodayInput]   = useState('')

  const { tasks, loading, fetchTasks } = useNotionTasks()

  useEffect(() => { fetchTasks() }, [])

  // Sync prefill values when returning from break (component may already be mounted)
  useEffect(() => {
    if (prefillTask)   setTaskName(prefillTask)
    if (prefillTaskId) setTaskId(prefillTaskId)
    if (prefillArea) {
      const norm = AREAS.find(a => prefillArea.includes(a.label))?.label || prefillArea
      setSelectedArea(norm)
    }
  }, [prefillTask, prefillArea, prefillTaskId])

  // Persist today tasks
  useEffect(() => { saveTodayTasks(todayTasks) }, [todayTasks])

  const canStart = taskName.trim().length > 0

  function selectTask(task: { id: string; name: string; area: string }) {
    setTaskName(task.name)
    setTaskId(task.id)
    const match = AREAS.find(a => task.area.includes(a.label) || task.area.includes(a.emoji))
    if (match) setSelectedArea(match.label)
    else if (task.area) setSelectedArea(task.area)
  }

  function toggleArea(label: string) {
    setSelectedArea(prev => prev === label ? '' : label)
  }

  function handleStart() {
    if (!canStart) return
    const areaStr = AREAS.find(a => a.label === selectedArea)
      ? `${AREAS.find(a => a.label === selectedArea)!.emoji} ${selectedArea}`
      : selectedArea
    onStart(taskName.trim(), taskId, areaStr)
    if (prefillTask) window.history.replaceState({}, '', '/')
  }

  // TODAY'S TASKS helpers
  function addTodayTask() {
    const text = todayInput.trim()
    if (!text) return
    setTodayTasks(prev => [...prev, { id: crypto.randomUUID(), text, done: false }])
    setTodayInput('')
  }

  function toggleTodayDone(id: string) {
    setTodayTasks(prev => {
      const updated = prev.map(t => t.id === id ? { ...t, done: !t.done } : t)
      // Move done to bottom
      return [...updated.filter(t => !t.done), ...updated.filter(t => t.done)]
    })
  }

  function selectTodayTask(task: TodayTask) {
    if (task.done) return
    setTaskName(task.text)
    setTaskId('')
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

      {/* ─── Header bar ─── */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-base">🍅</span>
          <span style={{ ...FONT, fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>POMO</span>
        </div>
        <div className="flex items-center gap-3">
          {completedPomodoros > 0 && (
            <span style={{ ...FONT, fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>#{completedPomodoros}</span>
          )}
          <button onClick={onOpenSettings} className="px-btn text-white/40 hover:text-white text-base">⚙</button>
        </div>
      </div>

      <div className="flex flex-col px-4 gap-4 max-w-md mx-auto w-full" style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>

        {/* ─── Area grid ─── */}
        <div style={CARD_STYLE}>
          <p style={{ ...FONT, fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}><span className="zh" style={{ fontSize: 14 }}>领域</span></p>
          <div className="grid grid-cols-2 gap-1.5">
            {AREAS.map(area => (
              <button
                key={area.id}
                onClick={() => toggleArea(area.label)}
                className="px-btn"
                style={{
                  ...FONT,
                  gridColumn: 'full' in area ? '1 / -1' : undefined,
                  background: selectedArea === area.label ? 'var(--work-lo)' : 'rgba(255,255,255,0.04)',
                  border: `2px solid ${selectedArea === area.label ? 'var(--work-hi)' : 'rgba(255,255,255,0.12)'}`,
                  color: selectedArea === area.label ? '#ff8888' : 'rgba(255,255,255,0.65)',
                  borderRadius: 6, padding: '8px 10px', textAlign: 'left',
                  fontSize: 17, cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                <span style={EM}>{area.emoji}</span> <span className="zh-btn">{area.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ─── Notion tasks ─── */}
        <div style={CARD_STYLE}>
          <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
            <p style={{ ...FONT, fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Notion <span className="zh" style={{ fontSize: 14 }}>任务</span></p>
            {isLoggedIn && (
              <button onClick={fetchTasks} className="px-btn" style={{ ...FONT, fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>↻</button>
            )}
          </div>
          {!isLoggedIn ? (
            <p style={{ ...FONT, fontSize: 12, color: 'rgba(255,255,255,0.2)', padding: '4px 0' }}><span style={EM}>⚙</span> <span className="zh" style={{ fontSize: 15 }}>登录后显示</span></p>
          ) : loading ? (
            <p style={{ ...FONT, fontSize: 12, color: 'rgba(255,255,255,0.25)', padding: '4px 0' }}><span className="zh" style={{ fontSize: 15 }}>载入中...</span></p>
          ) : tasks.length === 0 ? (
            <p style={{ ...FONT, fontSize: 12, color: 'rgba(255,255,255,0.2)', padding: '4px 0' }}><span className="zh" style={{ fontSize: 15 }}>无进行中任务（检查 Settings → Notion Token）</span></p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {tasks.map(task => (
                <button
                  key={task.id}
                  onClick={() => selectTask(task)}
                  className="px-btn w-full text-left"
                  style={{
                    ...FONT, fontSize: 13,
                    padding: '8px 12px',
                    background: taskId === task.id ? 'var(--work-lo)' : 'rgba(255,255,255,0.04)',
                    border: `2px solid ${taskId === task.id ? 'var(--work-border)' : 'rgba(255,255,255,0.1)'}`,
                    color: taskId === task.id ? '#ffaaaa' : 'rgba(255,255,255,0.7)',
                    borderRadius: 6,
                  }}
                >
                  <div className="truncate">{task.name}</div>
                  {task.area && <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, marginTop: 2 }}>{task.area}</div>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ─── TODAY'S TASKS ─── */}
        <div style={CARD_STYLE}>
          <p style={{ ...FONT, fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>📋 TODAY'S TASKS</p>

          {/* Input row */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
            <input
              style={{
                ...FONT, flex: 1, fontSize: 16, padding: '6px 10px',
                borderRadius: 6, border: '1px solid rgba(255,255,255,0.15)',
                background: 'rgba(255,255,255,0.07)', color: '#fff', outline: 'none',
              }}
              placeholder="添加任务..."
              value={todayInput}
              onChange={e => setTodayInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addTodayTask()}
            />
            <button
              onClick={addTodayTask}
              className="px-btn"
              style={{
                padding: '6px 12px', fontSize: 16, borderRadius: 6,
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'rgba(255,255,255,0.08)', color: '#fff', flexShrink: 0,
              }}
            >+</button>
          </div>

          {/* Task list */}
          {todayTasks.length === 0 ? (
            <p style={{ ...FONT, fontSize: 12, color: 'rgba(255,255,255,0.2)', padding: '2px 0' }}><span className="zh" style={{ fontSize: 15 }}>暂无任务</span></p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {todayTasks.map(task => (
                <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {/* Checkbox */}
                  <div
                    onClick={() => toggleTodayDone(task.id)}
                    style={{
                      width: 14, height: 14, borderRadius: 3, flexShrink: 0, cursor: 'pointer',
                      border: `2px solid ${task.done ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.4)'}`,
                      background: task.done ? 'rgba(255,255,255,0.15)' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    {task.done && <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', lineHeight: 1 }}>✓</span>}
                  </div>
                  {/* Task name — click to select */}
                  <button
                    onClick={() => selectTodayTask(task)}
                    disabled={task.done}
                    className="px-btn"
                    style={{
                      ...FONT, flex: 1, textAlign: 'left', fontSize: 13,
                      padding: '6px 10px', borderRadius: 6,
                      background: taskName === task.text && !taskId ? 'var(--work-lo)' : 'rgba(255,255,255,0.04)',
                      border: `2px solid ${taskName === task.text && !taskId ? 'var(--work-border)' : 'rgba(255,255,255,0.08)'}`,
                      color: task.done ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.75)',
                      textDecoration: task.done ? 'line-through' : 'none',
                      cursor: task.done ? 'default' : 'pointer',
                    }}
                  >
                    {task.text}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>


        {/* ─── URGENT / MEMO notes from current session ─── */}
        {(urgentItems.length > 0 || memoItems.length > 0) && (
          <div style={{ ...CARD_STYLE, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {urgentItems.length > 0 && (
              <div>
                <p style={{ ...FONT, fontSize: 11, color: '#ff6666', marginBottom: 6 }}>
                  <span style={EM}>🚨</span> URGENT
                </p>
                {urgentItems.map(item => (
                  <p key={item.id} style={{ ...FONT, fontSize: 13, color: 'rgba(255,150,150,0.7)', borderLeft: '2px solid rgba(255,100,100,0.4)', paddingLeft: 8, marginBottom: 4 }}>
                    {item.text}
                  </p>
                ))}
              </div>
            )}
            {memoItems.length > 0 && (
              <div>
                <p style={{ ...FONT, fontSize: 11, color: '#aaddff', marginBottom: 6 }}>
                  <span style={EM}>📌</span> MEMO
                </p>
                {memoItems.map(item => (
                  <p key={item.id} style={{ ...FONT, fontSize: 13, color: 'rgba(150,200,255,0.7)', borderLeft: '2px solid rgba(100,150,255,0.4)', paddingLeft: 8, marginBottom: 4 }}>
                    {item.text}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── START ─── */}
        <button
          onClick={handleStart}
          disabled={!canStart}
          className="px-btn w-full"
          style={{
            ...FONT, padding: '16px 0', fontSize: 16,
            letterSpacing: '0.08em',
            border: `3px solid ${canStart ? 'var(--work-hi)' : 'rgba(255,255,255,0.15)'}`,
            background: canStart ? 'var(--work-lo)' : 'transparent',
            color: canStart ? '#ff8888' : 'rgba(255,255,255,0.2)',
            borderRadius: 8,
            boxShadow: canStart ? '0 0 12px rgba(204,68,68,0.3)' : 'none',
            marginBottom: 16,
          }}
        >
          ▶ START
        </button>

      </div>
    </div>
  )
}
