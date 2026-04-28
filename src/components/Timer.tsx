import { useState } from 'react'
import type { TimerData } from '../hooks/useTimer'
import { ProgressBar } from './ProgressBar'

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

const PHASE_BG: Record<string, string> = {
  work:          'bg-work',
  'short-break': 'bg-short-break',
  'long-break':  'bg-long-break',
}

const PHASE_LABEL: Record<string, string> = {
  work:          'FOCUS TIME',
  'short-break': 'SHORT BREAK',
  'long-break':  'LONG BREAK',
}

/* ── Inline interruption panel (side-by-side) ── */
function InlineInterruption({
  urgentItems, memoItems, onAddUrgent, onAddMemo,
}: {
  urgentItems: { id: string; text: string }[]
  memoItems:   { id: string; text: string }[]
  onAddUrgent: (t: string) => void
  onAddMemo:   (t: string) => void
}) {
  const [urgentOpen, setUrgentOpen] = useState(false)
  const [memoOpen,   setMemoOpen]   = useState(false)
  const [urgentInput, setUrgentInput] = useState('')
  const [memoInput,   setMemoInput]   = useState('')

  function submitUrgent() {
    const t = urgentInput.trim()
    if (!t) return
    onAddUrgent(t)
    setUrgentInput('')
  }

  function submitMemo() {
    const t = memoInput.trim()
    if (!t) return
    onAddMemo(t)
    setMemoInput('')
  }

  return (
    <div className="flex gap-0 border border-white/20 overflow-hidden text-xs"
         style={{ fontFamily: 'var(--font-pixel)' }}>

      {/* Urgent */}
      <div className="flex-1 border-r border-white/20">
        <button
          onClick={() => setUrgentOpen(o => !o)}
          className="pixel-btn w-full flex items-center justify-between px-3 py-2 text-white/70 hover:text-white"
        >
          <span>
            🚨 <span className="ml-1">紧急</span>
            {urgentItems.length > 0 && (
              <span className="ml-1 text-yellow-300">({urgentItems.length})</span>
            )}
          </span>
          <span className="text-white/40 text-xs">{urgentOpen ? '▲' : '▼'}</span>
        </button>
        {urgentOpen && (
          <div className="px-3 pb-3 space-y-1.5">
            {urgentItems.map(i => (
              <p key={i.id} className="text-white/50 text-xs border-l border-white/20 pl-2 leading-relaxed">{i.text}</p>
            ))}
            <div className="flex gap-1 mt-2">
              <input
                className="flex-1 bg-white/10 border border-white/20 px-2 py-1 text-white text-xs placeholder-white/30"
                style={{ fontFamily: 'var(--font-pixel)', outline: 'none' }}
                placeholder="记录..."
                value={urgentInput}
                onChange={e => setUrgentInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && submitUrgent()}
              />
              <button
                onClick={submitUrgent}
                className="pixel-btn px-2 py-1 bg-white/15 hover:bg-white/25 text-white"
              >+</button>
            </div>
          </div>
        )}
      </div>

      {/* Memo */}
      <div className="flex-1">
        <button
          onClick={() => setMemoOpen(o => !o)}
          className="pixel-btn w-full flex items-center justify-between px-3 py-2 text-white/70 hover:text-white"
        >
          <span>
            📌 <span className="ml-1">备忘</span>
            {memoItems.length > 0 && (
              <span className="ml-1 text-yellow-300">({memoItems.length})</span>
            )}
          </span>
          <span className="text-white/40 text-xs">{memoOpen ? '▲' : '▼'}</span>
        </button>
        {memoOpen && (
          <div className="px-3 pb-3 space-y-1.5">
            {memoItems.map(i => (
              <p key={i.id} className="text-white/50 text-xs border-l border-white/20 pl-2 leading-relaxed">{i.text}</p>
            ))}
            <div className="flex gap-1 mt-2">
              <input
                className="flex-1 bg-white/10 border border-white/20 px-2 py-1 text-white text-xs placeholder-white/30"
                style={{ fontFamily: 'var(--font-pixel)', outline: 'none' }}
                placeholder="记录..."
                value={memoInput}
                onChange={e => setMemoInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && submitMemo()}
              />
              <button
                onClick={submitMemo}
                className="pixel-btn px-2 py-1 bg-white/15 hover:bg-white/25 text-white"
              >+</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export function Timer({
  data, soundEnabled,
  onPause, onResume, onReset, onSkip, onToggleSound,
  onAddUrgent, onAddMemo,
}: Props) {
  const [confirmReset, setConfirmReset] = useState(false)
  const isBreak   = data.phase !== 'work'
  const isRunning = data.state === 'running'

  return (
    <div
      className={`min-h-screen ${PHASE_BG[data.phase]} pixel-grid phase-transition page-fade flex flex-col font-pixel`}
      style={{ fontFamily: 'var(--font-pixel)' }}
    >
      {/* ─── Top bar: phase label + tomato count ─── */}
      <div className="flex items-center justify-between px-5 pt-5 pb-2">
        <span className="text-white/70 text-xs tracking-widest">{PHASE_LABEL[data.phase]}</span>
        <div className="flex gap-1">
          {Array.from({ length: 4 }).map((_, i) => (
            <span
              key={i}
              className="text-base transition-opacity"
              style={{ opacity: i < data.completedCount ? 1 : 0.2 }}
            >🍅</span>
          ))}
        </div>
      </div>

      {/* ─── Center: task name + countdown ─── */}
      <div className="flex-1 flex flex-col items-center justify-center gap-5 px-5">

        {/* Task name */}
        {data.taskName && (
          <p
            className="text-white text-xs text-center max-w-xs leading-relaxed"
            style={{ textShadow: '0 0 12px rgba(255,255,255,0.5)', fontWeight: 700 }}
          >
            {data.taskName}
          </p>
        )}

        {/* Timer box */}
        <div
          className="pixel-box px-8 py-5 text-center"
          style={{ background: 'rgba(0,0,0,0.15)' }}
        >
          <span
            className={`text-white tabular-nums ${isRunning ? 'timer-glow-pulse' : 'timer-glow'}`}
            style={{ fontSize: 'clamp(3rem, 15vw, 5rem)', letterSpacing: '0.05em', fontFamily: "'Press Start 2P', monospace" }}
          >
            {formatTime(data.remaining)}
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full max-w-xs">
          <ProgressBar remaining={data.remaining} total={data.totalSeconds} />
        </div>
      </div>

      {/* ─── Bottom controls ─── */}
      <div className="px-5 pb-6 space-y-3 max-w-md mx-auto w-full">

        {/* Control buttons */}
        <div className="flex gap-2">
          {/* Pause / Resume */}
          <button
            onClick={isRunning ? onPause : onResume}
            className="pixel-btn flex-1 py-4 border-2 border-white bg-white/10 text-white text-xs hover:bg-white/20"
            style={{ fontFamily: 'var(--font-pixel)' }}
          >
            {isRunning ? 'PAUSE' : 'RESUME'}
          </button>

          {/* Skip — only during breaks */}
          {isBreak && (
            <button
              onClick={onSkip}
              className="pixel-btn flex-1 py-4 border-2 border-white/50 text-white/70 text-xs hover:border-white hover:text-white"
              style={{ fontFamily: 'var(--font-pixel)' }}
            >
              SKIP
            </button>
          )}

          {/* Reset */}
          {confirmReset ? (
            <>
              <button
                onClick={() => { onReset(); setConfirmReset(false) }}
                className="pixel-btn px-3 py-4 border-2 border-yellow-400 text-yellow-400 text-xs hover:bg-yellow-400/10"
                style={{ fontFamily: 'var(--font-pixel)' }}
              >
                OK
              </button>
              <button
                onClick={() => setConfirmReset(false)}
                className="pixel-btn px-3 py-4 border-2 border-white/30 text-white/40 text-xs"
                style={{ fontFamily: 'var(--font-pixel)' }}
              >
                ✕
              </button>
            </>
          ) : (
            <button
              onClick={() => setConfirmReset(true)}
              className="pixel-btn px-4 py-4 border-2 border-white/30 text-white/50 text-xs hover:border-white/60 hover:text-white/70"
              style={{ fontFamily: 'var(--font-pixel)' }}
            >
              RESET
            </button>
          )}

          {/* Sound toggle */}
          <button
            onClick={onToggleSound}
            className="pixel-btn px-3 py-4 border-2 border-white/30 text-base hover:border-white/60"
            title={soundEnabled ? '静音' : '开启声音'}
          >
            {soundEnabled ? '🔊' : '🔇'}
          </button>
        </div>

        {/* Interruption panels — only during work */}
        {!isBreak && (
          <InlineInterruption
            urgentItems={data.urgentItems}
            memoItems={data.memoItems}
            onAddUrgent={onAddUrgent}
            onAddMemo={onAddMemo}
          />
        )}
      </div>
    </div>
  )
}
