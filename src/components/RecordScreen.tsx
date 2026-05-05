import { useState } from 'react'
import { supabase } from '../lib/supabase'
import type { RecordData } from '../types'
import type { TimerData } from '../hooks/useTimer'

interface Props {
  timerData: TimerData
  completedPomodoros: number
  onSubmit: (record: RecordData) => void
  onBack: () => void
}

const SCENES  = ['在家', '公共空间', '有人陪', '外出独处'] as const
const ENERGYS = ['↑ 上升', '→ 持平', '↓ 下降'] as const

const FONT = { fontFamily: 'var(--font)' }
const C    = { background: 'var(--card)' }
// Emojis need system-ui so the pixel font doesn't corrupt them
const EM: React.CSSProperties = { fontFamily: 'system-ui, -apple-system, sans-serif' }

function SelectRow<T extends string>({
  label, options, value, onChange,
}: {
  label: string; options: readonly T[]; value: T | null; onChange: (v: T | null) => void
}) {
  return (
    <div>
      <p style={{ ...FONT, fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>{label}</p>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {options.map(opt => (
          <button
            key={opt}
            onClick={() => onChange(value === opt ? null : opt)}
            className="px-btn"
            style={{
              ...FONT,
              fontSize: 19,
              padding: '5px 10px', borderRadius: 4,
              border: `1px solid ${value === opt ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.15)'}`,
              background: value === opt ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.03)',
              color: value === opt ? '#fff' : 'rgba(255,255,255,0.5)',
            }}
          ><span className="zh">{opt}</span></button>
        ))}
      </div>
    </div>
  )
}

export function RecordScreen({ timerData, completedPomodoros, onSubmit, onBack }: Props) {
  const [whatDone,     setWhatDone]     = useState('')
  const [focus,        setFocus]        = useState<number | null>(null)
  const [scene,        setScene]        = useState<typeof SCENES[number] | null>(null)
  const [energy,       setEnergy]       = useState<typeof ENERGYS[number] | null>(null)
  const [writeGoodtime,setWriteGoodtime]= useState(false)
  const [aiInput,      setAiInput]      = useState('')
  const [aiLoading,    setAiLoading]    = useState(false)

  async function handleAIParse() {
    const text = aiInput.trim()
    if (!text || aiLoading) return
    setAiLoading(true)
    try {
      const { data } = await supabase.functions.invoke('ai-parse', { body: { text } })
      if (data?.result_note) setWhatDone(data.result_note)
      if (data?.engagement)  setFocus(data.engagement)
      if (data?.energy) {
        const found = ENERGYS.find(e => e === data.energy)
        if (found) setEnergy(found)
      }
      if (data?.scene) {
        const found = SCENES.find(s => data.scene?.includes(s))
        if (found) setScene(found)
      }
    } catch { /* silent */ } finally {
      setAiLoading(false)
    }
  }

  function handleSubmit() {
    onSubmit({
      task_name: timerData.taskName,
      task_id:   timerData.taskId   || undefined,
      area:      timerData.area     || undefined,
      engagement: focus             || undefined,
      energy:    energy             || undefined,
      scene:     scene              || undefined,
      result_note: whatDone         || undefined,
      write_goodtime: writeGoodtime,
      duration:  25,
      started_at: timerData.startedAt || new Date().toISOString(),
      interruptions_urgent: timerData.urgentItems.map(i => i.text),
      interruptions_memo:   timerData.memoItems.map(i => i.text),
    })
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

      {/* ─── Header ─── */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <span style={EM} className="text-base">🍅</span>
          <span style={{ color: 'var(--work-hi)', fontSize: 14, ...FONT }}>RECORD</span>
        </div>
        {completedPomodoros > 0 && (
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, ...FONT }}>#{completedPomodoros}</span>
        )}
      </div>

      <div
        className="flex flex-col px-4 gap-3 max-w-md mx-auto w-full"
        style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', msOverflowStyle: 'none' } as React.CSSProperties}
      >

        {/* ─── Task name + area ─── */}
        <div style={{
          border: '2px solid var(--work-border)', borderRadius: 6, padding: '10px 14px',
          background: 'rgba(170,51,51,0.12)',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 17, color: '#ffaaaa', letterSpacing: '0.05em' }}>
            <span className="zh">{timerData.taskName}</span>
          </div>
          {timerData.area && (
            <div style={{ fontSize: 13, color: 'rgba(255,170,170,0.6)', marginTop: 4, letterSpacing: '0.06em' }}>
              <span className="zh-btn">{timerData.area}</span>
            </div>
          )}
        </div>

        {/* ─── All fields ─── */}
        <div style={{ border: '2px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '12px', ...C, display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* WHAT DID YOU DO */}
          <div>
            <p style={{ ...FONT, fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>
              <span style={EM}>✏️</span> WHAT DID YOU DO
            </p>
            <textarea
              style={{
                ...FONT, fontSize: 14, color: '#fff',
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 4, padding: '6px 8px',
                resize: 'none', width: '100%', outline: 'none',
              }}
              rows={2}
              placeholder="..."
              value={whatDone}
              onChange={e => setWhatDone(e.target.value)}
            />
          </div>

          {/* FOCUS (1-5) */}
          <div>
            <p style={{ ...FONT, fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>
              <span style={EM}>⚡</span> FOCUS (1-5)
            </p>
            <div style={{ display: 'flex', gap: 6 }}>
              {[1,2,3,4,5].map(v => (
                <button
                  key={v}
                  onClick={() => setFocus(focus === v ? null : v)}
                  className="px-btn"
                  style={{
                    fontFamily: 'serif', fontSize: 32,
                    color: v <= (focus ?? 0) ? '#ffcc44' : 'rgba(255,255,255,0.2)',
                    background: 'transparent', border: 'none', padding: '2px 4px',
                    transition: 'color 0.15s',
                  }}
                >
                  {v <= (focus ?? 0) ? '★' : '☆'}
                </button>
              ))}
            </div>
          </div>

          {/* SCENE */}
          <SelectRow label="🏠 SCENE" options={SCENES} value={scene} onChange={setScene} />

          {/* ENERGY */}
          <SelectRow label="⚡ ENERGY" options={ENERGYS} value={energy} onChange={setEnergy} />

          {/* Write to Good Time Log */}
          <div
            onClick={() => setWriteGoodtime(v => !v)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', paddingTop: 4 }}
          >
            <div style={{
              width: 14, height: 14, borderRadius: 3, flexShrink: 0,
              border: `2px solid ${writeGoodtime ? '#ffcc44' : 'rgba(255,255,255,0.25)'}`,
              background: writeGoodtime ? '#ffcc44' : 'transparent',
              transition: 'all 0.15s',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {writeGoodtime && <span style={{ fontSize: 10, color: '#000', lineHeight: 1 }}>✓</span>}
            </div>
            <span style={{ ...FONT, fontSize: 11, color: writeGoodtime ? '#ffcc44' : 'rgba(255,255,255,0.5)' }}>
              <span style={EM}>⭐</span> WRITE TO GOOD TIME LOG
            </span>
          </div>
        </div>

        {/* ─── AI PARSE ─── */}
        <div style={{ border: '2px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '10px 12px', ...C }}>
          <p style={{ ...FONT, fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>
            <span style={EM}>✨</span> AI PARSE
          </p>
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              style={{
                ...FONT, flex: 1, fontSize: 13, padding: '6px 8px', borderRadius: 4,
                border: '1px solid rgba(255,255,255,0.15)',
                background: 'rgba(255,255,255,0.06)', color: '#fff', outline: 'none',
              }}
              placeholder="Describe what you did..."
              value={aiInput}
              onChange={e => setAiInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAIParse()}
            />
            <button
              onClick={handleAIParse}
              disabled={!aiInput.trim() || aiLoading}
              className="px-btn"
              style={{
                ...FONT, fontSize: 13, padding: '6px 14px', borderRadius: 4,
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'rgba(255,255,255,0.06)',
                color: aiLoading ? 'rgba(255,255,255,0.3)' : '#fff',
              }}
            >
              {aiLoading ? '...' : '→'}
            </button>
          </div>
        </div>

        {/* ─── Action buttons ─── */}
        <div style={{ display: 'flex', gap: 8, marginTop: 'auto', paddingTop: 4 }}>
          <button
            onClick={onBack}
            className="px-btn"
            style={{
              ...FONT, flex: 1, padding: '14px 0',
              border: '2px solid rgba(255,255,255,0.15)', borderRadius: 8,
              background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.5)',
              fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            <span style={EM}>←</span> RESTART
          </button>
          <button
            onClick={handleSubmit}
            className="px-btn"
            style={{
              ...FONT, flex: 2, padding: '14px 0',
              border: '2px solid var(--work-hi)', borderRadius: 8,
              background: 'var(--work-lo)', color: '#ff8888',
              fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              boxShadow: '0 0 10px rgba(204,68,68,0.3)',
            }}
          >
            <span style={EM}>✓</span> SUBMIT
          </button>
        </div>

      </div>
    </div>
  )
}
