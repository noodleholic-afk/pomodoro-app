import { useState } from 'react'
import type { TimerData } from '../hooks/useTimer'
import { unlockAudioContext } from '../lib/audio'

interface Props {
  data: TimerData
  soundEnabled: boolean
  completedPomodoros: number
  onPause: () => void
  onResume: () => void
  onSkip: () => void
  onToggleSound: () => void
}

const FONT = { fontFamily: 'var(--font)' }

function fmt(s: number) {
  const m = Math.floor(s / 60).toString().padStart(2, '0')
  const sec = (s % 60).toString().padStart(2, '0')
  return `${m}:${sec}`
}

export function BreakScreen({
  data, soundEnabled, completedPomodoros,
  onPause, onResume, onSkip, onToggleSound,
}: Props) {
  const isShort   = data.phase === 'short-break'
  const hi        = isShort ? 'var(--green)' : 'var(--blue)'
  const lo        = isShort ? '#0a2818'      : '#0a1030'
  const border    = isShort ? 'rgba(68,255,136,0.5)' : 'rgba(136,170,255,0.5)'
  const glowClass = isShort ? 'glow-green' : 'glow-blue'
  const label     = isShort ? 'SHORT BREAK' : 'LONG BREAK'
  const minutes   = isShort ? '5 MIN' : '15 MIN'
  const isRunning = data.state === 'running'
  const cyclePos  = completedPomodoros % 4

  const [checkedUrgent, setCheckedUrgent] = useState<Set<string>>(new Set())
  const [checkedMemo,   setCheckedMemo]   = useState<Set<string>>(new Set())

  function toggleUrgent(id: string) {
    setCheckedUrgent(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }
  function toggleMemo(id: string) {
    setCheckedMemo(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function withUnlock(fn: () => void) {
    return () => { unlockAudioContext(); fn() }
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
        '--grid-color': isShort ? 'rgba(68,255,136,0.055)' : 'rgba(136,170,255,0.055)',
      } as React.CSSProperties}
    >

      {/* ─── Header ─── */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-base">☕</span>
          <span style={{ color: hi, fontSize: 10, ...FONT }}>{label}</span>
        </div>
        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, ...FONT }}>{minutes}</span>
      </div>

      <div className="flex-1 flex flex-col px-4 pb-5 gap-3 max-w-md mx-auto w-full">

        {/* ─── 4 progress blocks ─── */}
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', padding: '4px 0' }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{
              width: 28, height: 14, borderRadius: 3,
              background: i < cyclePos ? hi : i === cyclePos ? lo : '#111320',
              border: `2px solid ${i < cyclePos ? hi : i === cyclePos ? border : 'rgba(255,255,255,0.08)'}`,
              boxShadow: i < cyclePos ? `0 0 6px ${hi}66` : 'none',
              transition: 'all 0.3s',
            }} />
          ))}
        </div>

        {/* ─── Timer display ─── */}
        <div style={{
          background: '#060810',
          border: `3px solid ${border}`,
          borderRadius: 8, padding: '20px 12px',
          textAlign: 'center', position: 'relative',
        }}>
          {[[-1,-1],[1,-1],[-1,1],[1,1]].map(([x,y], i) => (
            <div key={i} style={{
              position: 'absolute', width: 5, height: 5, borderRadius: 1,
              background: hi,
              top: x < 0 ? 5 : undefined, bottom: x > 0 ? 5 : undefined,
              left: y < 0 ? 5 : undefined, right: y > 0 ? 5 : undefined,
            }} />
          ))}
          <span
            className={isRunning ? glowClass : ''}
            style={{
              fontFamily: "'Press Start 2P', monospace",
              fontSize: 'clamp(2.8rem, 14vw, 4.5rem)',
              color: '#fff',
              letterSpacing: '0.06em',
              display: 'block',
              textShadow: isRunning ? undefined : '0 0 8px rgba(255,255,255,0.4)',
            }}
          >
            {fmt(data.remaining)}
          </span>
        </div>

        {/* ─── Progress bar ─── */}
        <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 3, height: 6, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.15)' }}>
          <div style={{
            height: '100%', borderRadius: 3,
            background: hi,
            transition: 'width 1s linear',
            width: `${data.totalSeconds > 0 ? ((data.totalSeconds - data.remaining) / data.totalSeconds) * 100 : 0}%`,
            boxShadow: `0 0 8px ${hi}99`,
          }} />
        </div>

        {/* ─── Checklist (interruptions) ─── */}
        {(data.urgentItems.length > 0 || data.memoItems.length > 0) && (
          <div style={{ border: '2px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '10px 12px', background: 'rgba(255,255,255,0.03)' }}>
            {data.urgentItems.length > 0 && (
              <>
                <p style={{ ...FONT, fontSize: 8, color: '#ff6666', marginBottom: 6 }}>🚨 URGENT</p>
                {data.urgentItems.map(item => (
                  <div
                    key={item.id}
                    onClick={() => toggleUrgent(item.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, cursor: 'pointer' }}
                  >
                    <div style={{
                      width: 12, height: 12, borderRadius: 2, flexShrink: 0,
                      border: '2px solid rgba(255,100,100,0.5)',
                      background: checkedUrgent.has(item.id) ? '#ff6666' : 'transparent',
                      transition: 'background 0.15s',
                    }} />
                    <span style={{
                      ...FONT, fontSize: 9,
                      color: checkedUrgent.has(item.id) ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.65)',
                      textDecoration: checkedUrgent.has(item.id) ? 'line-through' : 'none',
                    }}>{item.text}</span>
                  </div>
                ))}
              </>
            )}
            {data.memoItems.length > 0 && (
              <>
                <p style={{ ...FONT, fontSize: 8, color: '#aaddff', marginBottom: 6, marginTop: data.urgentItems.length > 0 ? 8 : 0 }}>📌 MEMO</p>
                {data.memoItems.map(item => (
                  <div
                    key={item.id}
                    onClick={() => toggleMemo(item.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, cursor: 'pointer' }}
                  >
                    <div style={{
                      width: 12, height: 12, borderRadius: 2, flexShrink: 0,
                      border: '2px solid rgba(100,150,255,0.5)',
                      background: checkedMemo.has(item.id) ? '#88aaff' : 'transparent',
                      transition: 'background 0.15s',
                    }} />
                    <span style={{
                      ...FONT, fontSize: 9,
                      color: checkedMemo.has(item.id) ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.65)',
                      textDecoration: checkedMemo.has(item.id) ? 'line-through' : 'none',
                    }}>{item.text}</span>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {/* ─── Controls ─── */}
        <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
          {/* PAUSE / RESUME */}
          <button
            onClick={withUnlock(isRunning ? onPause : onResume)}
            className="px-btn"
            style={{
              ...FONT, flex: 2, padding: '14px 0',
              border: `2px solid ${border}`,
              borderRadius: 8, fontSize: 11,
              background: lo, color: hi,
              boxShadow: `0 0 10px ${hi}33`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <span>{isRunning ? '⏸ PAUSE' : '▶ RESUME'}</span>
          </button>

          {/* SKIP */}
          <button
            onClick={onSkip}
            className="px-btn"
            style={{
              padding: '14px 12px',
              border: '2px solid rgba(255,255,255,0.15)', borderRadius: 8,
              background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
            }}
          >
            <span style={{ fontSize: 16 }}>⏭</span>
            <span style={{ ...FONT, fontSize: 6, color: 'rgba(255,255,255,0.3)' }}>SKIP</span>
          </button>

          {/* SOUND */}
          <button
            onClick={withUnlock(onToggleSound)}
            className="px-btn"
            style={{
              padding: '14px 12px', fontSize: 16,
              border: '2px solid rgba(255,255,255,0.15)', borderRadius: 8,
              background: 'rgba(255,255,255,0.05)',
              color: soundEnabled ? '#fff' : 'rgba(255,255,255,0.3)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
            }}
          >
            <span>{soundEnabled ? '🔊' : '🔇'}</span>
            <span style={{ ...FONT, fontSize: 6, color: 'rgba(255,255,255,0.3)' }}>SOUND</span>
          </button>
        </div>

      </div>
    </div>
  )
}
