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

type RecordType = '专注' | '学习' | '行政' | '复盘'
type EnergyType = '↑ 上升' | '→ 持平' | '↓ 下降'
type InterruptionType = '无' | '内部' | '外部'
type SceneType = '🏠 在家' | '☕ 公共空间' | '👥 有人陪' | '🚶 外出独处'

function ToggleBtn<T extends string>({ value, selected, onClick }: { value: T; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-2 border text-xs pixel-btn transition-all ${
        selected
          ? 'border-white bg-white text-gray-900'
          : 'border-white/40 text-white/70 hover:border-white/70 hover:text-white'
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
      className={`w-10 h-10 border text-xs pixel-btn transition-all ${
        selected
          ? 'border-white bg-white text-gray-900'
          : 'border-white/40 text-white/70 hover:border-white/70'
      }`}
    >
      {value}
    </button>
  )
}

export function RecordScreen({ timerData, onSubmit, onSkip }: Props) {
  const [voiceInput, setVoiceInput] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [isListening, setIsListening] = useState(false)

  const [type, setType] = useState<RecordType | null>(null)
  const [engagement, setEngagement] = useState<number | null>(null)
  const [energy, setEnergy] = useState<EnergyType | null>(null)
  const [interruption, setInterruption] = useState<InterruptionType | null>(null)
  const [scene, setScene] = useState<SceneType | null>(null)
  const [resultNote, setResultNote] = useState('')
  const [trigger, setTrigger] = useState('')

  function applyAIResult(result: AIParseResult) {
    if (result.type) setType(result.type)
    if (result.engagement) setEngagement(result.engagement)
    if (result.energy) setEnergy(result.energy)
    if (result.interruption) setInterruption(result.interruption)
    if (result.scene) setScene(result.scene)
    if (result.result_note) setResultNote(result.result_note)
    if (result.trigger) setTrigger(result.trigger)
  }

  async function handleAIParse() {
    const text = voiceInput.trim()
    if (!text) return
    setAiLoading(true)
    setAiError(null)
    try {
      const { data, error } = await supabase.functions.invoke('ai-parse', {
        body: { text },
      })
      if (error) throw error
      applyAIResult(data as AIParseResult)
    } catch {
      setAiError('AI 解析失败，请手动选择')
    } finally {
      setAiLoading(false)
    }
  }

  function startVoice() {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      alert('当前浏览器不支持语音输入，请手动输入')
      return
    }
    const rec = new SpeechRecognition()
    rec.lang = 'zh-CN'
    rec.onstart = () => setIsListening(true)
    rec.onend = () => setIsListening(false)
    rec.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript
      setVoiceInput(prev => prev + transcript)
    }
    rec.start()
  }

  function handleSubmit() {
    const record: RecordData = {
      task_name: timerData.taskName,
      task_id: timerData.taskId || undefined,
      area: timerData.area || undefined,
      type: type || undefined,
      engagement: engagement || undefined,
      energy: energy || undefined,
      interruption: interruption || undefined,
      scene: scene || undefined,
      result_note: resultNote || undefined,
      trigger: trigger || undefined,
      duration: 25,
      started_at: timerData.startedAt || new Date().toISOString(),
      interruptions_urgent: timerData.urgentItems.map(i => i.text),
      interruptions_memo: timerData.memoItems.map(i => i.text),
    }
    onSubmit(record)
  }

  const allUrgent = timerData.urgentItems
  const allMemo = timerData.memoItems

  return (
    <div className="min-h-screen bg-gray-900 font-pixel overflow-y-auto">
      <div className="max-w-md mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="text-4xl mb-3">🍅</div>
          <h2 className="text-white text-sm tracking-widest">番茄完成！</h2>
          <p className="text-white/50 text-xs mt-2 leading-relaxed">
            {timerData.taskName}
          </p>
        </div>

        {/* Voice / AI parse */}
        <div className="space-y-3 border border-white/10 p-4">
          <p className="text-white/60 text-xs">🤖 说一句话，AI 自动解析</p>
          <div className="flex gap-2">
            <input
              className="flex-1 bg-white/5 border border-white/20 px-3 py-2 text-white text-xs outline-none font-pixel placeholder-white/30"
              placeholder="描述这段时间..."
              value={voiceInput}
              onChange={e => setVoiceInput(e.target.value)}
            />
            <button
              onClick={startVoice}
              className={`px-3 py-2 border text-xs pixel-btn ${isListening ? 'border-red-400 text-red-400' : 'border-white/30 text-white/60 hover:text-white'}`}
            >
              {isListening ? '◉' : '🎤'}
            </button>
          </div>
          <button
            onClick={handleAIParse}
            disabled={!voiceInput.trim() || aiLoading}
            className="w-full py-2 bg-white/10 border border-white/30 text-white text-xs pixel-btn hover:bg-white/20 disabled:opacity-30"
          >
            {aiLoading ? '解析中...' : '🤖 AI 解析'}
          </button>
          {aiError && <p className="text-red-400 text-xs">{aiError}</p>}
        </div>

        {/* Manual form */}
        <div className="space-y-5">
          {/* Type */}
          <div className="space-y-2">
            <p className="text-white/50 text-xs">类型</p>
            <div className="flex gap-2 flex-wrap">
              {(['专注', '学习', '行政', '复盘'] as RecordType[]).map(v => (
                <ToggleBtn key={v} value={v} selected={type === v} onClick={() => setType(type === v ? null : v)} />
              ))}
            </div>
          </div>

          {/* Engagement */}
          <div className="space-y-2">
            <p className="text-white/50 text-xs">投入程度</p>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map(v => (
                <NumBtn key={v} value={v} selected={engagement === v} onClick={() => setEngagement(engagement === v ? null : v)} />
              ))}
            </div>
          </div>

          {/* Energy */}
          <div className="space-y-2">
            <p className="text-white/50 text-xs">能量变化</p>
            <div className="flex gap-2">
              {(['↑ 上升', '→ 持平', '↓ 下降'] as EnergyType[]).map(v => (
                <ToggleBtn key={v} value={v} selected={energy === v} onClick={() => setEnergy(energy === v ? null : v)} />
              ))}
            </div>
          </div>

          {/* Interruption */}
          <div className="space-y-2">
            <p className="text-white/50 text-xs">中断</p>
            <div className="flex gap-2">
              {(['无', '内部', '外部'] as InterruptionType[]).map(v => (
                <ToggleBtn key={v} value={v} selected={interruption === v} onClick={() => setInterruption(interruption === v ? null : v)} />
              ))}
            </div>
          </div>

          {/* Scene */}
          <div className="space-y-2">
            <p className="text-white/50 text-xs">场景</p>
            <div className="flex gap-2 flex-wrap">
              {(['🏠 在家', '☕ 公共空间', '👥 有人陪', '🚶 外出独处'] as SceneType[]).map(v => (
                <ToggleBtn key={v} value={v} selected={scene === v} onClick={() => setScene(scene === v ? null : v)} />
              ))}
            </div>
          </div>

          {/* Result note */}
          <div className="space-y-2">
            <p className="text-white/50 text-xs">结果一句话（可选）</p>
            <textarea
              className="w-full bg-white/5 border border-white/20 px-3 py-2 text-white text-xs outline-none font-pixel placeholder-white/30 resize-none"
              rows={2}
              placeholder="完成了什么？"
              value={resultNote}
              onChange={e => setResultNote(e.target.value)}
            />
          </div>

          {/* Trigger */}
          {(energy === '↑ 上升' || energy === '↓ 下降') && (
            <div className="space-y-2">
              <p className="text-white/50 text-xs">触发因素（因为...）</p>
              <input
                className="w-full bg-white/5 border border-white/20 px-3 py-2 text-white text-xs outline-none font-pixel placeholder-white/30"
                placeholder="能量变化的原因..."
                value={trigger}
                onChange={e => setTrigger(e.target.value)}
              />
            </div>
          )}
        </div>

        {/* Interruptions summary */}
        {(allUrgent.length > 0 || allMemo.length > 0) && (
          <div className="border border-yellow-500/30 p-4 space-y-2">
            <p className="text-yellow-400/70 text-xs">休息时处理：</p>
            {allUrgent.map(i => (
              <p key={i.id} className="text-white/60 text-xs">🚨 {i.text}</p>
            ))}
            {allMemo.map(i => (
              <p key={i.id} className="text-white/60 text-xs">📌 {i.text}</p>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pb-8">
          <button
            onClick={handleSubmit}
            className="flex-1 py-5 bg-white text-gray-900 text-xs pixel-btn hover:bg-white/90"
          >
            ✅ 完成并记录
          </button>
          <button
            onClick={onSkip}
            className="flex-1 py-5 border-2 border-white/30 text-white/60 text-xs pixel-btn hover:border-white/60"
          >
            ⏭ 跳过
          </button>
        </div>
      </div>
    </div>
  )
}
