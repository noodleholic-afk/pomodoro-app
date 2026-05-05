import { useState } from 'react'
import type { TimerData } from '../hooks/useTimer'
import { unlockAudioContext } from '../lib/audio'

interface Props {
  data: TimerData
  soundEnabled: boolean
  completedPomodoros: number
  onPause: () => void
  onResume: () => void
  onReset: () => void
  onSkip: () => void
  onToggleSound: () => void
  onAddUrgent: (text: string) => void
  onAddMemo: (text: string) => void
  onPurge: () => void
}

const FONT = { fontFamily: 'var(--font)' }
const C    = { background: 'var(--card)' }
const EM: React.CSSProperties = { fontFamily: 'system-ui, -apple-system, sans-serif', fontStyle: 'normal' }

function fmt(s: number) {
  const m = Math.floor(s / 60).toString().padStart(2, '0')
  const sec = (s % 60).toString().padStart(2, '0')
  return `${m}:${sec}`
}

function WorkInterruption({
  urgentItems, memoItems, onAddUrgent, onAddMemo,
}: {
  urgentItems: { id: string; text: string }[]
  memoItems:   { id: string; text: string }[]
  onAddUrgent: (t: string) => void
  onAddMemo:   (t: string) => void
}) {
  const [urgentOpen,  setUrgentOpen]  = useState(false)
  const [memoOpen,    setMemoOpen]    = useState(false)
  const [urgentInput, setUrgentInput] = useState('')
  const [memoInput,   setMemoInput]   = useState('')

  function submit(value: string, add: (t: string) => void, clear: () => void) {
    const t = value.trim()
    if (!t) return
    add(t)
    clear()
  }

  const half: React.CSSProperties = {
    flex: '1 1 0', minWidth: 0,
    display: 'flex', flexDirection: 'column',
    border: '2px solid rgba(255,255,255,0.1)', borderRadius: 6,
    overflow: 'hidden', ...C,
  }

  const toggleBtn: React.CSSProperties = {
    ...FONT, display: 'flex', justifyContent: 'center', alignItems: 'center',
    gap: 6, padding: '8px 10px', fontSize: 14,
    color: 'rgba(255,255,255,0.65)',
    background: 'transparent', border: 'none', cursor: 'pointer', width: '100%',
  }

  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <div style={half}>
        <button className="px-btn" onClick={() => setUrgentOpen(o => !o)} style={toggleBtn}>
          <span style={EM}>🚨</span>
          <span style={{ color: '#ff6666' }}>{urgentItems.length > 0 ? urgentItems.length : 'URGENT'}</span>
          <span style={{ ...EM, color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>{urgentOpen ? '▼' : '▶'}</span>
        </button>
        {urgentOpen && (
          <div style={{ padding: '0 8px 8px' }}>
            {urgentItems.map(i => (
              <p key={i.id} style={{ ...FONT, fontSize: 13, color: 'rgba(255,255,255,0.5)', borderLeft: '2px solid rgba(255,100,100,0.4)', paddingLeft: 6, marginBottom: 4, textAlign: 'center' }}>{i.text}</p>
            ))}
            <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
              <input
                style={{ ...FONT, flex: 1, minWidth: 0, padding: '4px 6px', fontSize: 13, borderRadius: 4, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.07)', color: '#fff', outline: 'none' }}
                placeholder="Note..."
                value={urgentInput}
                onChange={e => setUrgentInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && submit(urgentInput, onAddUrgent, () => setUrgentInput(''))}
              />
              <button className="px-btn" onClick={() => submit(urgentInput, onAddUrgent, () => setUrgentInput(''))}
                style={{ padding: '4px 8px', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 4, background: 'rgba(255,255,255,0.08)', color: '#fff', fontSize: 14, flexShrink: 0 }}>+</button>
            </div>
          </div>
        )}
      </div>

      <div style={half}>
        <button className="px-btn" onClick={() => setMemoOpen(o => !o)} style={toggleBtn}>
          <span style={EM}>📌</span>
          <span style={{ color: '#aaddff' }}>{memoItems.length > 0 ? memoItems.length : 'MEMO'}</span>
          <span style={{ ...EM, color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>{memoOpen ? '▼' : '▶'}</span>
        </button>
        {memoOpen && (
          <div style={{ padding: '0 8px 8px' }}>
            {memoItems.map(i => (
              <p key={i.id} style={{ ...FONT, fontSize: 13, color: 'rgba(255,255,255,0.5)', borderLeft: '2px solid rgba(100,150,255,0.4)', paddingLeft: 6, marginBottom: 4, textAlign: 'center' }}>{i.text}</p>
            ))}
            <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
              <input
                style={{ ...FONT, flex: 1, minWidth: 0, padding: '4px 6px', fontSize: 13, borderRadius: 4, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.07)', color: '#fff', outline: 'none' }}
                placeholder="Note..."
                value={memoInput}
                onChange={e => setMemoInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && submit(memoInput, onAddMemo, () => setMemoInput(''))}
              />
              <button className="px-btn" onClick={() => submit(memoInput, onAddMemo, () => setMemoInput(''))}
                style={{ padding: '4px 8px', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 4, background: 'rgba(255,255,255,0.08)', color: '#fff', fontSize: 14, flexShrink: 0 }}>+</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export function Timer({
  data, soundEnabled, completedPomodoros,
  onPause, onResume, onReset, onSkip, onToggleSound, onAddUrgent, onAddMemo, onPurge,
}: Props) {
  const isRunning = data.state === 'running'
  const cyclePos  = completedPomodoros % 4
  const [purgeConfirm, setPurgeConfirm] = useState(false)

  function withUnlock(fn: () => void) {
    return () => { unlockAudioContext(); fn() }
  }

  function handlePurge() {
    if (!purgeConfirm) { setPurgeConfirm(true); return }
    onPurge()
    setPurgeConfirm(false)
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
        '--grid-color': 'rgba(204,68,68,0.07)',
      } as React.CSSProperties}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <span style={EM} className="text-base">🍅</span>
          <span style={{ color: 'var(--work-hi)', fontSize: 14, ...FONT }}>WORK</span>
        </div>
        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, ...FONT }}>25 MIN</span>
      </div>

      <div className="flex flex-col px-4 gap-3 max-w-md mx-auto w-full" style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>

        {/* 4 progress blocks */}
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', padding: '4px 0' }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{
              width: 28, height: 14, borderRadius: 3,
              background: i < cyclePos ? 'var(--work-hi)' : i === cyclePos ? '#884444' : '#2a0808',
              border: `2px solid ${i < cyclePos ? '#ff6666' : i === cyclePos ? 'var(--work-border)' : '#3a1010'}`,
              boxShadow: i < cyclePos ? '0 0 6px rgba(204,68,68,0.5)' : 'none',
              transition: 'all 0.3s',
            }} />
          ))}
        </div>

        {/* Task name + area */}
        {data.taskName && (
          <div className="blink-task" style={{
            border: '2px solid var(--work-border)', borderRadius: 6, padding: '10px 14px',
            background: 'rgba(170,51,51,0.12)',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 19, color: '#ffaaaa', letterSpacing: '0.05em' }}>
              <span className="zh">{data.taskName}</span>
            </div>
            {data.area && (
              <div style={{ fontSize: 14, color: '#ffcc99', marginTop: 6, letterSpacing: '0.06em' }}>
                <span className="zh-btn">{data.area}</span>
              </div>
            )}
          </div>
        )}

        {/* Timer display */}
        <div style={{
          background: '#060810', border: '3px solid var(--work-border)',
          borderRadius: 8, padding: '20px 12px',
          textAlign: 'center', position: 'relative',
        }}>
          {[[-1,-1],[1,-1],[-1,1],[1,1]].map(([x,y], i) => (
            <div key={i} style={{
              position: 'absolute', width: 5, height: 5, borderRadius: 1,
              background: 'var(--work-hi)',
              top: x < 0 ? 5 : undefined, bottom: x > 0 ? 5 : undefined,
              left: y < 0 ? 5 : undefined, right: y > 0 ? 5 : undefined,
            }} />
          ))}
          <span
            className={isRunning ? 'glow-white' : ''}
            style={{
              fontFamily: "'Press Start 2P', monospace",
              fontSize: 'clamp(2.8rem, 14vw, 4.5rem)',
              color: '#fff', letterSpacing: '0.06em', display: 'block',
              textShadow: isRunning ? undefined : '0 0 8px rgba(255,255,255,0.4)',
            }}
          >
            {fmt(data.remaining)}
          </span>
        </div>

        {/* Progress bar */}
        <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 3, height: 6, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.15)' }}>
          <div style={{
            height: '100%', background: 'var(--work-hi)', borderRadius: 3,
            transition: 'width 1s linear',
            width: `${data.totalSeconds > 0 ? ((data.totalSeconds - data.remaining) / data.totalSeconds) * 100 : 0}%`,
            boxShadow: '0 0 8px rgba(204,68,68,0.6)',
          }} />
        </div>

        {/* Interruption inputs */}
        <WorkInterruption
          urgentItems={data.urgentItems}
          memoItems={data.memoItems}
          onAddUrgent={onAddUrgent}
          onAddMemo={onAddMemo}
        />

        {/* PURGE button */}
        {(data.urgentItems.length > 0 || data.memoItems.length > 0) && (
          <button
            onClick={handlePurge}
            className="px-btn"
            style={{
              ...FONT, width: '100%', padding: '8px',
              border: `1px solid ${purgeConfirm ? 'rgba(200,50,50,0.6)' : 'rgba(200,80,80,0.25)'}`,
              borderRadius: 6,
              background: purgeConfirm ? 'rgba(180,30,30,0.25)' : 'rgba(150,30,30,0.08)',
              color: purgeConfirm ? '#ff8888' : 'rgba(220,100,100,0.6)',
              fontSize: 13, letterSpacing: '0.05em',
              transition: 'all 0.15s',
            }}
          >
            <span style={EM}>{purgeConfirm ? '⚠' : '🗑'}</span> {purgeConfirm ? 'PURGE all notes? (tap again)' : 'PURGE'}
          </button>
        )}

        {/* DEBUG SKIP row */}
        <button
          onClick={onSkip}
          className="px-btn"
          style={{
            ...FONT, width: '100%', padding: '8px',
            border: '1px dashed rgba(255,255,255,0.2)', borderRadius: 6,
            background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.35)',
            fontSize: 13, letterSpacing: '0.05em',
          }}
        >
          <span style={EM}>⏭</span> SKIP WORK (DEBUG)
        </button>

        {/* Controls */}
        <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
          <button
            onClick={withUnlock(isRunning ? onPause : onResume)}
            className="px-btn"
            style={{
              ...FONT, flex: 2, padding: '14px 0',
              border: '2px solid var(--work-border)', borderRadius: 8, fontSize: 16,
              background: 'var(--work-lo)', color: '#ff8888',
              boxShadow: '0 0 10px rgba(170,51,51,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            <span style={EM}>{isRunning ? '⏸' : '▶'}</span>
            {isRunning ? 'PAUSE' : 'RESUME'}
          </button>

          <button
            onClick={withUnlock(onToggleSound)}
            className="px-btn"
            style={{
              padding: '14px 12px', fontSize: 20,
              border: '2px solid rgba(255,255,255,0.15)', borderRadius: 8,
              background: 'rgba(255,255,255,0.05)', color: soundEnabled ? '#fff' : 'rgba(255,255,255,0.3)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
            }}
          >
            <span style={EM}>{soundEnabled ? '🔊' : '🔇'}</span>
            <span style={{ ...FONT, fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>SOUND</span>
          </button>

          <button
            onClick={onReset}
            className="px-btn"
            style={{
              ...FONT, padding: '14px 12px',
              border: '2px solid rgba(255,255,255,0.15)', borderRadius: 8,
              background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.4)',
              fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <span style={EM}>↺</span>
          </button>
        </div>
      </div>
    </div>
  )
}
