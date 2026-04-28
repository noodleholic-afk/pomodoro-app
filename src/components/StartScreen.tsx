import { useState, useEffect } from 'react'
import { useNotionTasks } from '../hooks/useNotionTasks'

interface Props {
  prefillTask?: string
  prefillArea?: string
  prefillTaskId?: string
  onStart: (taskName: string, taskId: string, area: string) => void
  onOpenSettings: () => void
}

export function StartScreen({ prefillTask, prefillArea, prefillTaskId, onStart, onOpenSettings }: Props) {
  const [taskName, setTaskName] = useState(prefillTask || '')
  const [taskId, setTaskId]     = useState(prefillTaskId || '')
  const [area, setArea]         = useState(prefillArea || '')
  const { tasks, loading, fetchTasks } = useNotionTasks()

  useEffect(() => { fetchTasks() }, [])

  const canStart = taskName.trim().length > 0

  function handleStart() {
    if (!canStart) return
    onStart(taskName.trim(), taskId, area)
  }

  function selectTask(task: { id: string; name: string; area: string }) {
    setTaskName(task.name)
    setTaskId(task.id)
    setArea(task.area)
  }

  function handleManualInput(value: string) {
    setTaskName(value)
    setTaskId('')
    setArea('')
  }

  return (
    <div className="min-h-screen bg-work pixel-grid phase-transition page-fade flex flex-col p-5 font-pixel"
         style={{ fontFamily: "var(--font-pixel)" }}>

      {/* ─── Top bar ─── */}
      <div className="flex justify-end">
        <button
          onClick={onOpenSettings}
          className="pixel-btn text-white/50 hover:text-white text-base leading-none p-2"
          title="设置"
        >
          ⚙
        </button>
      </div>

      {/* ─── Main content ─── */}
      <div className="flex-1 flex flex-col items-center justify-center gap-8 max-w-md mx-auto w-full">

        {/* Logo */}
        <div className="text-center">
          <div className="text-7xl mb-4 drop-shadow-lg">🍅</div>
          <h1 className="text-white text-base tracking-widest">POMODORO</h1>
          <p className="text-white/40 text-xs mt-2">专注一件事</p>
        </div>

        {/* Manual input — always first */}
        <div className="w-full space-y-3">
          <input
            className="pixel-btn w-full bg-transparent pixel-box px-4 py-3 text-white text-xs placeholder-white/40 focus:placeholder-white/20 transition-all"
            style={{ fontFamily: "var(--font-pixel)" }}
            placeholder="输入任务名称..."
            value={taskName}
            onChange={e => handleManualInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && canStart && handleStart()}
            autoFocus
          />
          {taskName.trim() && !taskId && (
            <input
              className="pixel-btn w-full bg-transparent border-2 border-white/30 px-4 py-3 text-white text-xs placeholder-white/30 transition-all"
              style={{ fontFamily: "var(--font-pixel)" }}
              placeholder="所属领域（可选）"
              value={area}
              onChange={e => setArea(e.target.value)}
            />
          )}
        </div>

        {/* Notion quick-select — only when loaded */}
        {(loading || tasks.length > 0) && (
          <div className="w-full">
            {loading ? (
              <p className="text-white/30 text-xs text-center py-1">载入最近任务...</p>
            ) : (
              <div className="space-y-2">
                <p className="text-white/40 text-xs mb-3">▸ 最近进行中的任务</p>
                {tasks.map(task => (
                  <button
                    key={task.id}
                    onClick={() => selectTask(task)}
                    className={`pixel-btn w-full text-left px-4 py-3 border-2 text-xs transition-all ${
                      taskId === task.id
                        ? 'border-white bg-white/20 text-white'
                        : 'border-white/30 bg-white/5 text-white/70 hover:border-white/70 hover:bg-white/10 hover:text-white'
                    }`}
                    style={{ fontFamily: "var(--font-pixel)" }}
                  >
                    <div className="font-medium truncate">{task.name}</div>
                    {task.area && <div className="text-white/40 mt-0.5 text-xs">{task.area}</div>}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* START button */}
        <button
          onClick={handleStart}
          disabled={!canStart}
          className={`pixel-btn w-full py-5 border-4 text-sm tracking-widest transition-all ${
            canStart
              ? 'border-white bg-white text-work hover:bg-white/90 hover:scale-[1.01]'
              : 'border-white/20 bg-transparent text-white/20 cursor-not-allowed'
          }`}
          style={{ fontFamily: "var(--font-pixel)" }}
        >
          START
        </button>
      </div>
    </div>
  )
}
