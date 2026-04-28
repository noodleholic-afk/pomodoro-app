import { useState } from 'react'
import { supabase } from '../lib/supabase'
import type { RecordData, AIParseResult } from '../types'
import type { TimerData } from '../hooks/useTimer'

interface Props {
  timerData: TimerData
  completedPomodoros: number
  onSubmit: (record: RecordData) => void
  onSkip: () => void
}

type RecordType     = '专注' | '学习' | '行政' | '复盘'
type EnergyType     = '↑ 上升' | '→ 持平' | '↓ 下降'
type InterruptType  = '无' | '内部' | '外部'
type SceneType      = '🏠 在家' | '☕ 公共空间' | '👥 有人陪' | '🚶 外出独处'

const FONT = { fontFamily: 'var(--font-pixel)' }

function ToggleBtn({ value, selected, onClick }: { value: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={FONT}
      className={`pixel-btn px-3 py-2 border text-xs transition-all ${
        selected
          ? 'border-white bg-white text-gray-900'
          : 'border-white/30 text-white/60 hover:border-white/70 hover:text-white bg-white/5'
      }`}
    >
      {value}
    </button>
  )
}

function NumBtn({ value, selected, onClick }: { value: number; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={FONT}
      className={`pixel-btn w-11 h-11 border text-xs transition-all ${
        selected
          ? 'border-white bg-white text-gray-900'
          : 'border-white/30 text-white/60 hover:border-white/70 hover:text-white bg-white/5'
      }`}
    >
      {value}
    </button>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-white/40 text-xs mb-2" style={FONT}>{children}</p>
}

export function RecordScreen({ timerData, onSubmit, onSkip }: Props) {
  const [voiceInput,  setVoiceInput]  = useState('')
  const [aiLoading,   setAiLoading]   = useState(false)
  const [aiError,     setAiError]     = useState<string | null>(null)
  const [isListening, setIsListening] = useState(false)

  const [type,        setType]        = useState<RecordType | null>(null)
  const [engagement,  setEngagement]  = useState<number | null>(null)
  const [energy,      setEnergy]      = useState<EnergyType | null>(null)
  const [interruption,setInterruption]= useState<InterruptType | null>(null)
  const [scene,       setScene]       = useState<SceneType | null>(null)
  const [resultNote,  setResultNote]  = useState('')
  const [trigger,     setTrigger]     = useState('')

  function applyAIResult(r: AIParseResult) {
    if (r.type)        setType(r.type)
    if (r.engagement)  setEngagement(r.engagement)
    if (r.energy)      setEnergy(r.energy)
    if (r.interruption)setInterruption(r.interruption)
    if (r.scene)       setScene(r.scene)
    if (r.result_note) setResultNote(r.result_note)
    if (r.trigger)     setTrigger(r.trigger)
  }

  async function handleAIParse() {
    const text = voiceInput.trim()
    if (!text) return
    setAiLoading(true)
    setAiError(null)
    try {
      const { data, error } = await supabase.functions.invoke('ai-parse', { body: { text } })
      if (error) throw error
      applyAIResult(data as AIParseResult)
    } catch {
      setAiError('AI 解析失败，请手动选择')
    } finally {
      setAiLoading(false)
    }
  }

  function startVoice() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) { alert('浏览器不支持语音输入'); return }
    const rec = new SR()
    rec.lang    = 'zh-CN'
    rec.onstart = () => setIsListening(true)
    rec.onend   = () => setIsListening(false)
    rec.onresult = (e: any) => setVoiceInput(p => p + e.results[0][0].transcript)
    rec.start()
  }

  function handleSubmit() {
    onSubmit({
      task_name: timerData.taskName,
      task_id:   timerData.taskId   || undefined,
      area:      timerData.area     || undefined,
      type:      type               || undefined,
      engagement:engagement         || undefined,
      energy:    energy             || undefined,
      interruption: interruption    || undefined,
      scene:     scene              || undefined,
      result_note: resultNote       || undefined,
      trigger:   trigger            || undefined,
      duration:  25,
      started_at: timerData.startedAt || new Date().toISOString(),
      interruptions_urgent: timerData.urgentItems.map(i => i.text),
      interruptions_memo:   timerData.memoItems.map(i => i.text),
    })
  }

  const allUrgent = timerData.urgentItems
  const allMemo   = timerData.memoItems

  return (
    <div className="min-h-screen page-fade overflow-y-auto" style={{ background: '#1a1a2e' }}>
      <div className="max-w-md mx-auto px-4 py-8 space-y-6 font-pixel" style={FONT}>

        {/* ─── Header ─── */}
        <div className="text-center space-y-2 pb-2">
          <div className="text-5xl">🍅</div>
          <h2 className="text-white text-sm tracking-widest" style={FONT}>番茄完成！</h2>
          <p className="text-white/50 text-xs leading-relaxed" style={FONT}>{timerData.taskName}</p>
        </div>

        <hr className="section-divider" />

        {/* ─── AI parse ─── */}
        <div className="space-y-3 border border-white/10 p-4" style={{ background: 'rgba(255,255,255,0.03)' }}>
          <p className="text-white/50 text-xs" style={FONT}>🤖 说一句话，AI 自动解析</p>
          <div className="flex gap-2">
            <input
              style={{ ...FONT, outline: 'none' }}
              className="flex-1 bg-white/5 border border-white/20 px-3 py-2 text-white text-xs placeholder-white/25"
              placeholder="描述这段时间做了什么..."
              value={voiceInput}
              onChange={e => setVoiceInput(e.target.value)}
            />
            <button
              onClick={startVoice}
              className={`pixel-btn px-3 border text-base ${
                isListening
                  ? 'border-red-400 text-red-400'
                  : 'border-white/30 text-white/50 hover:border-white hover:text-white'
              }`}
            >
              {isListening ? '◉' : '🎤'}
            </button>
          </div>
          <button
            onClick={handleAIParse}
            disabled={!voiceInput.trim() || aiLoading}
            style={FONT}
            className="pixel-btn w-full py-2 border border-white/30 bg-white/5 text-white text-xs hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {aiLoading ? '解析中...' : '🤖 AI 解析'}
          </button>
          {aiError && <p className="text-red-400/80 text-xs" style={FONT}>{aiError}</p>}
        </div>

        {/* ─── Manual form ─── */}
        <div className="space-y-5">

          {/* Type */}
          <div>
            <SectionLabel>类型</SectionLabel>
            <div className="flex gap-2 flex-wrap">
              {(['专注','学习','行政','复盘'] as RecordType[]).map(v => (
                <ToggleBtn key={v} value={v} selected={type === v} onClick={() => setType(type === v ? null : v)} />
              ))}
            </div>
          </div>

          {/* Engagement */}
          <div>
            <SectionLabel>投入程度</SectionLabel>
            <div className="flex gap-2">
              {[1,2,3,4,5].map(v => (
                <NumBtn key={v} value={v} selected={engagement === v} onClick={() => setEngagement(engagement === v ? null : v)} />
              ))}
            </div>
          </div>

          {/* Energy */}
          <div>
            <SectionLabel>能量变化</SectionLabel>
            <div className="flex gap-2 flex-wrap">
              {(['↑ 上升','→ 持平','↓ 下降'] as EnergyType[]).map(v => (
                <ToggleBtn key={v} value={v} selected={energy === v} onClick={() => setEnergy(energy === v ? null : v)} />
              ))}
            </div>
          </div>

          {/* Trigger — only when energy changed */}
          {(energy === '↑ 上升' || energy === '↓ 下降') && (
            <div>
              <SectionLabel>触发因素（因为...）</SectionLabel>
              <input
                style={{ ...FONT, outline: 'none' }}
                className="w-full bg-white/5 border border-white/20 px-3 py-2 text-white text-xs placeholder-white/25"
                placeholder="能量变化的原因..."
                value={trigger}
                onChange={e => setTrigger(e.target.value)}
              />
            </div>
          )}

          {/* Interruption */}
          <div>
            <SectionLabel>中断</SectionLabel>
            <div className="flex gap-2">
              {(['无','内部','外部'] as InterruptType[]).map(v => (
                <ToggleBtn key={v} value={v} selected={interruption === v} onClick={() => setInterruption(interruption === v ? null : v)} />
              ))}
            </div>
          </div>

          {/* Scene */}
          <div>
            <SectionLabel>场景</SectionLabel>
            <div className="flex gap-2 flex-wrap">
              {(['🏠 在家','☕ 公共空间','👥 有人陪','🚶 外出独处'] as SceneType[]).map(v => (
                <ToggleBtn key={v} value={v} selected={scene === v} onClick={() => setScene(scene === v ? null : v)} />
              ))}
            </div>
          </div>

          {/* Result note */}
          <div>
            <SectionLabel>结果一句话（可选）</SectionLabel>
            <textarea
              style={{ ...FONT, outline: 'none', resize: 'none' }}
              className="w-full bg-white/5 border border-white/20 px-3 py-2 text-white text-xs placeholder-white/25"
              rows={2}
              placeholder="完成了什么？有什么进展？"
              value={resultNote}
              onChange={e => setResultNote(e.target.value)}
            />
          </div>
        </div>

        {/* ─── Interruptions summary ─── */}
        {(allUrgent.length > 0 || allMemo.length > 0) && (
          <div className="border border-yellow-500/20 p-4 space-y-1.5" style={{ background: 'rgba(234,179,8,0.05)' }}>
            <p className="text-yellow-400/60 text-xs mb-2" style={FONT}>休息时处理：</p>
            {allUrgent.map(i => <p key={i.id} className="text-white/50 text-xs" style={FONT}>🚨 {i.text}</p>)}
            {allMemo.map(i => <p key={i.id} className="text-white/50 text-xs" style={FONT}>📌 {i.text}</p>)}
          </div>
        )}

        {/* ─── Action buttons ─── */}
        <div className="flex gap-3 pb-8">
          <button
            onClick={handleSubmit}
            style={FONT}
            className="pixel-btn flex-1 py-4 border-2 border-white bg-white text-gray-900 text-xs hover:bg-white/90"
          >
            ✅ 完成并记录
          </button>
          <button
            onClick={onSkip}
            style={FONT}
            className="pixel-btn flex-1 py-4 border-2 border-white/25 text-white/50 text-xs hover:border-white/50 hover:text-white/70"
          >
            ⏭ 跳过
          </button>
        </div>
      </div>
    </div>
  )
}
