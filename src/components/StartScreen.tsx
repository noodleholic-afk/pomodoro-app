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
  const [taskId, setTaskId] = useState(prefillTaskId || '')
  const [area, setArea] = useState(prefillArea || '')
  const { tasks, loading, error, fetchTasks } = useNotionTasks()

  useEffect(() => {
    fetchTasks()
  }, [])

  function handleStart() {
    const name = taskName.trim()
    if (!name) return
    onStart(name, taskId, area)
  }

  function selectTask(task: { id: string; name: string; area: string }) {
    setTaskName(task.name)
    setTaskId(task.id)
    setArea(task.area)
  }

  return (
    <div className="min-h-screen bg-work pixel-grid phase-transition flex flex-col items-center justify-center p-6 font-pixel">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="text-5xl mb-4">🍅</div>
        <h1 className="text-white text-lg tracking-widest">POMODORO</h1>
        <p className="text-white/50 text-xs mt-2">选择任务，开始专注</p>
      </div>

      {/* Recent tasks from Notion */}
      <div className="w-full max-w-md mb-6">
        <p className="text-white/60 text-xs mb-3">最近进行中的任务</p>
        {loading && <p className="text-white/40 text-xs text-center py-4">加载中...</p>}
        {error && (
          <p className="text-yellow-300/70 text-xs text-center py-2">
            {error}
            <button className="ml-2 underline" onClick={onOpenSettings}>配置 Notion</button>
          </p>
        )}
        {!loading && tasks.length === 0 && !error && (
          <p className="text-white/30 text-xs text-center py-2">暂无任务，请手动输入</p>
        )}
        <div className="space-y-2">
          {tasks.map(task => (
            <button
              key={task.id}
              onClick={() => selectTask(task)}
              className={`w-full text-left px-4 py-3 border-2 text-xs transition-all pixel-btn ${
                taskId === task.id
                  ? 'border-white bg-white/20 text-white'
                  : 'border-white/30 bg-white/5 text-white/70 hover:border-white/60 hover:bg-white/10'
              }`}
            >
              <div className="font-medium">{task.name}</div>
              {task.area && <div className="text-white/50 mt-1">{task.area}</div>}
            </button>
          ))}
        </div>
      </div>

      {/* Manual input */}
      <div className="w-full max-w-md space-y-3 mb-8">
        <input
          className="w-full bg-white/10 border-2 border-white/30 focus:border-white px-4 py-3 text-white text-xs outline-none placeholder-white/40 font-pixel transition-colors"
          placeholder="或手动输入任务名称..."
          value={taskName}
          onChange={e => { setTaskName(e.target.value); setTaskId(''); setArea('') }}
        />
        {taskName && !taskId && (
          <input
            className="w-full bg-white/10 border-2 border-white/30 focus:border-white px-4 py-3 text-white text-xs outline-none placeholder-white/40 font-pixel transition-colors"
            placeholder="所属领域（可选）"
            value={area}
            onChange={e => setArea(e.target.value)}
          />
        )}
      </div>

      {/* Start button */}
      <button
        onClick={handleStart}
        disabled={!taskName.trim()}
        className="w-full max-w-md py-5 bg-white text-work text-sm font-pixel tracking-widest pixel-btn border-4 border-white hover:bg-white/90 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
      >
        START
      </button>

      {/* Settings link */}
      <button
        onClick={onOpenSettings}
        className="mt-6 text-white/40 text-xs hover:text-white/70 pixel-btn"
      >
        ⚙ 设置
      </button>
    </div>
  )
}
