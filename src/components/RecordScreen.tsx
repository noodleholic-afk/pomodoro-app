import { useState } from 'react'
import { supabase } from '../lib/supabase'
import type { RecordData } from '../types'
import type { TimerData } from '../hooks/useTimer'

interface Props {
  timerData: TimerData
  completedPomodoros: number
  onSubmit: (record: RecordData) => void
  onBack: () => void   // ↩ RESTART — decrement count + go to start
}

type EnergyType = '↑ UP' | '→ FLAT' | '↓ DOWN'
type SceneType  = '🏠 HOME' | '☕ CAFÉ' | '👥 SOCIAL' | '🚶 OUT'

const FONT = { fontFamily: 'var(--font)' }
const C    = { background: 'var(--card)' }

export function RecordScreen({ timerData, completedPomodoros, onSubmit, onBack }: Props) {
  const [whatDone,   setWhatDone]   = useState('')
  const [focus,      setFocus]      = useState<number | null>(null)
  const [showDetail, setShowDetail] = useState(false)
  const [feeling,    setFeeling]    = useState('')
  const [scene,      setScene]      = useState<SceneType | null>(null)
  const [energy,     setEnergy]     = useState<EnergyType | null>(null)
  const [aiInput,    setAiInput]    = useState('')
  const [aiLoading,  setAiLoading]  = useState(false)

  async function handleAIParse() {
    const text = aiInput.trim()
    if (!text || aiLoading) return
    setAiLoading(true)
    try {
      const { data } = await supabase.functions.invoke('ai-parse', { body: { text } })
      if (data?.result_note) setWhatDone(data.result_note)
      if (data?.engagement)  setFocus(data.engagement)
      if (data?.energy) {
        const map: Record<string, EnergyType> = {
          '↑ 上升': '↑ UP', '→ 持平': '→ FLAT', '↓ 下降': '↓ DOWN',
        }
        setEnergy(map[data.energy] ?? null)
      }
    } catch { /* silent */ } finally {
      setAiLoading(false)
    }
  }

  function handleSubmit() {
    const energyMap: Record<EnergyType, string> = {
      '↑ UP': '↑ 上升', '→ FLAT': '→ 持平', '↓ DOWN': '↓ 下降',
    }
    const sceneMap: Record<SceneType, string> = {
      '🏠 HOME': '🏠 在家', '☕ CAFÉ': '☕ 公共空间',
      '👥 SOCIAL': '👥 有人陪', '🚶 OUT': '🚶 外出独处',
    }
    onSubmit({
      task_name: timerData.taskName,
      task_id:   timerData.taskId   || undefined,
      area:      timerData.area     || undefined,
      engagement: focus             || undefined,
      energy:    energy ? (energyMap[energy] as any) : undefined,
      scene:     scene  ? (sceneMap[scene]   as any) : undefined,
      result_note: (whatDone || feeling) || undefined,
      duration:  25,
      started_at: timerData.startedAt || new Date().toISOString(),
      interruptions_urgent: timerData.urgentItems.map(i => i.text),
      interruptions_memo:   timerData.memoItems.map(i => i.text),
    })
  }

  return (
    <div className="min-h-screen pixel-grid page-fade flex flex-col" style={{ background: 'var(--bg)', ...FONT }}>

      {/* ─── Header ─── */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-base">🍅</span>
          <span style={{ color: 'var(--work-hi)', fontSize: 10, ...FONT }}>RECORD</span>
        </div>
        {completedPomodoros > 0 && (
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, ...FONT }}>#{completedPomodoros}</span>
        )}
      </div>

      <div className="flex-1 flex flex-col px-4 pb-5 gap-3 max-w-md mx-auto w-full overflow-y-auto">

        {/* ─── Task name ─── */}
        <div style={{
          border: '2px solid var(--work-border)',
          borderRadius: 6, padding: '10px 14px',
          background: 'rgba(170,51,51,0.12)',
          ...FONT, fontSize: 11, color: '#ffaaaa',
          textAlign: 'center',
        }}>
          {timerData.taskName}
        </div>

        {/* ─── WHAT DID YOU DO ─── */}
        <div style={{ border: '2px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '10px 12px', ...C }}>
          <p style={{ ...FONT, fontSize: 8, color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>✍️ WHAT DID YOU DO</p>
          <textarea
            style={{
              ...FONT, fontSize: 10, color: '#fff',
              background: 'transparent', border: 'none', outline: 'none',
              resize: 'none', width: '100%',
            }}
            rows={3}
            placeholder="..."
            value={whatDone}
            onChange={e => setWhatDone(e.target.value)}
          />
        </div>

        {/* ─── FOCUS stars ─── */}
        <div style={{ border: '2px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '10px 12px', ...C }}>
          <p style={{ ...FONT, fontSize: 8, color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>⚡ FOCUS</p>
          <div style={{ display: 'flex', gap: 6 }}>
            {[1,2,3,4,5].map(v => (
              <button
                key={v}
                onClick={() => setFocus(focus === v ? null : v)}
                className="px-btn"
                style={{
                  fontFamily: 'serif', fontSize: 24,
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

        {/* ─── GOOD TIME LOG (collapsible) ─── */}
        <div style={{ border: '2px solid rgba(255,255,255,0.08)', borderRadius: 6, ...C, overflow: 'hidden' }}>
          <button
            onClick={() => setShowDetail(o => !o)}
            className="px-btn"
            style={{
              ...FONT, width: '100%', display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', padding: '10px 12px',
              background: 'transparent', border: 'none', cursor: 'pointer',
              fontSize: 9, color: 'rgba(255,255,255,0.5)',
            }}
          >
            <span>🌟 GOOD TIME LOG</span>
            <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 8 }}>{showDetail ? '▲' : '▼'}</span>
          </button>

          {showDetail && (
            <div style={{ padding: '0 12px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* Feeling */}
              <div>
                <p style={{ ...FONT, fontSize: 8, color: 'rgba(255,255,255,0.35)', marginBottom: 6 }}>FEELING</p>
                <input
                  style={{
                    ...FONT, fontSize: 9, color: '#fff',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 4, padding: '6px 8px', width: '100%', outline: 'none',
                  }}
                  placeholder="How did it feel?"
                  value={feeling}
                  onChange={e => setFeeling(e.target.value)}
                />
              </div>

              {/* Scene */}
              <div>
                <p style={{ ...FONT, fontSize: 8, color: 'rgba(255,255,255,0.35)', marginBottom: 6 }}>SCENE</p>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {(['🏠 HOME','☕ CAFÉ','👥 SOCIAL','🚶 OUT'] as SceneType[]).map(s => (
                    <button
                      key={s}
                      onClick={() => setScene(scene === s ? null : s)}
                      className="px-btn"
                      style={{
                        ...FONT, fontSize: 8, padding: '5px 8px', borderRadius: 4,
                        border: `1px solid ${scene === s ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.15)'}`,
                        background: scene === s ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.03)',
                        color: scene === s ? '#fff' : 'rgba(255,255,255,0.5)',
                      }}
                    >{s}</button>
                  ))}
                </div>
              </div>

              {/* Energy */}
              <div>
                <p style={{ ...FONT, fontSize: 8, color: 'rgba(255,255,255,0.35)', marginBottom: 6 }}>ENERGY</p>
                <div style={{ display: 'flex', gap: 6 }}>
                  {(['↑ UP','→ FLAT','↓ DOWN'] as EnergyType[]).map(e => (
                    <button
                      key={e}
                      onClick={() => setEnergy(energy === e ? null : e)}
                      className="px-btn"
                      style={{
                        ...FONT, fontSize: 8, padding: '5px 10px', borderRadius: 4,
                        border: `1px solid ${energy === e ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.15)'}`,
                        background: energy === e ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.03)',
                        color: energy === e ? '#fff' : 'rgba(255,255,255,0.5)',
                      }}
                    >{e}</button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ─── AI PARSE ─── */}
        <div style={{ border: '2px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '10px 12px', ...C }}>
          <p style={{ ...FONT, fontSize: 8, color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>✨ AI PARSE</p>
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              style={{
                ...FONT, flex: 1, fontSize: 9, padding: '6px 8px', borderRadius: 4,
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
                ...FONT, fontSize: 9, padding: '6px 14px', borderRadius: 4,
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
          {/* RESTART */}
          <button
            onClick={onBack}
            className="px-btn"
            style={{
              ...FONT, flex: 1, padding: '14px 0',
              border: '2px solid rgba(255,255,255,0.15)', borderRadius: 8,
              background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.5)',
              fontSize: 10,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
            }}
          >
            <span>↩ RESTART</span>
          </button>

          {/* SUBMIT */}
          <button
            onClick={handleSubmit}
            className="px-btn"
            style={{
              ...FONT, flex: 2, padding: '14px 0',
              border: '2px solid var(--work-hi)', borderRadius: 8,
              background: 'var(--work-lo)', color: '#ff8888',
              fontSize: 11,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              boxShadow: '0 0 10px rgba(204,68,68,0.3)',
            }}
          >
            <span>✓ SUBMIT</span>
          </button>
        </div>

      </div>
    </div>
  )
}
