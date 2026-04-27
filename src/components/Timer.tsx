import { useState } from 'react'
import type { TimerData } from '../hooks/useTimer'
import { ProgressBar } from './ProgressBar'
import { TomatoCount } from './TomatoCount'
import { InterruptionBox } from './InterruptionBox'

interface Props {
  data: TimerData
  soundEnabled: boolean
  onPause: () => void
  onResume: () => void
  onReset: () => void
  onSkip: () => void
  onToggleSound: () => void
  onAddUrgent: (text: string) => void
  onAddMemo: (text: string) => void
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

const PHASE_LABELS: Record<string, string> = {
  work: 'FOCUS',
  'short-break': 'SHORT BREAK',
  'long-break': 'LONG BREAK',
}

const PHASE_BG: Record<string, string> = {
  work: 'bg-work',
  'short-break': 'bg-short-break',
  'long-break': 'bg-long-break',
}

export function Timer({ data, soundEnabled, onPause, onResume, onReset, onSkip, onToggleSound, onAddUrgent, onAddMemo }: Props) {
  const [confirmReset, setConfirmReset] = useState(false)
  const isBreak = data.phase !== 'work'

  return (
    <div className={`min-h-screen ${PHASE_BG[data.phase]} pixel-grid phase-transition flex flex-col items-center justify-between py-8 px-4 font-pixel`}>
      {/* Top: task + sound */}
      <div className="w-full max-w-md flex items-start justify-between">
        <div className="flex-1 mr-2">
          {data.taskName && (
            <p className="text-white/70 text-xs truncate">{data.taskName}</p>
          )}
          {data.area && (
            <p className="text-white/40 text-xs mt-1">{data.area}</p>
          )}
        </div>
        <button
          onClick={onToggleSound}
          className="text-white/50 hover:text-white text-lg pixel-btn"
          title={soundEnabled ? '静音' : '开启声音'}
        >
          {soundEnabled ? '🔊' : '🔇'}
        </button>
      </div>

      {/* Center: phase label + timer */}
      <div className="flex flex-col items-center gap-6">
        <p className="text-white/60 text-xs tracking-widest">{PHASE_LABELS[data.phase]}</p>
        <div className="border-4 border-white px-10 py-6 pixel-border">
          <span className="text-white text-6xl font-pixel tabular-nums">
            {formatTime(data.remaining)}
          </span>
        </div>
        <TomatoCount count={data.completedCount} />
        <div className="w-full max-w-xs">
          <ProgressBar remaining={data.remaining} total={data.totalSeconds} />
        </div>
      </div>

      {/* Bottom: interruption boxes + controls */}
      <div className="w-full max-w-md space-y-3">
        {!isBreak && (
          <>
            <InterruptionBox label="计划外紧急" emoji="🚨" items={data.urgentItems} onAdd={onAddUrgent} />
            <InterruptionBox label="活动备忘" emoji="📌" items={data.memoItems} onAdd={onAddMemo} />
          </>
        )}

        <div className="flex gap-3 pt-2">
          {data.state === 'running' ? (
            <button
              onClick={onPause}
              className="flex-1 py-4 border-2 border-white text-white text-xs pixel-btn hover:bg-white/10"
            >
              PAUSE
            </button>
          ) : (
            <button
              onClick={onResume}
              className="flex-1 py-4 border-2 border-white text-white text-xs pixel-btn hover:bg-white/10"
            >
              RESUME
            </button>
          )}

          {isBreak && (
            <button
              onClick={onSkip}
              className="flex-1 py-4 border-2 border-white/50 text-white/70 text-xs pixel-btn hover:border-white hover:text-white"
            >
              SKIP
            </button>
          )}

          {confirmReset ? (
            <div className="flex gap-2">
              <button
                onClick={() => { onReset(); setConfirmReset(false) }}
                className="flex-1 py-4 border-2 border-yellow-400 text-yellow-400 text-xs pixel-btn"
              >
                确认
              </button>
              <button
                onClick={() => setConfirmReset(false)}
                className="flex-1 py-4 border-2 border-white/30 text-white/50 text-xs pixel-btn"
              >
                取消
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmReset(true)}
              className="px-4 py-4 border-2 border-white/30 text-white/50 text-xs pixel-btn hover:border-white/60"
            >
              RESET
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
