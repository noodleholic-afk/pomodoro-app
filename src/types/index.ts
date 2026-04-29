export type Phase = 'work' | 'short-break' | 'long-break'

export type TimerState = 'idle' | 'running' | 'paused' | 'completed'

export interface Interruption {
  id: string
  text: string
  createdAt: string
}

export interface PomodoroSession {
  id?: string
  user_id?: string
  phase: Phase
  total_seconds: number
  end_time: string | null
  pause_remaining: number | null
  completed_count: number
  task_name: string | null
  task_id: string | null
  area: string | null
  interruptions_urgent: Interruption[]
  interruptions_memo: Interruption[]
  started_at: string | null
  updated_at?: string
}

export interface RecordData {
  task_name: string
  task_id?: string
  area?: string
  engagement?: number
  energy?: '↑ 上升' | '→ 持平' | '↓ 下降'
  scene?: '在家' | '公共空间' | '有人陪' | '外出独处'
  result_note?: string
  write_goodtime?: boolean
  duration?: number
  started_at: string
  interruptions_urgent: string[]
  interruptions_memo: string[]
}

export interface NotionTask {
  id: string
  name: string
  area: string
}

export interface UserSettings {
  user_id: string
  notion_token: string | null
  notion_report_db: string
  notion_goodtime_db: string
  notion_para_db: string
  siliconflow_api_key: string | null
  ai_model: string
  sound_enabled: boolean
}

export interface AIParseResult {
  task_name?: string | null
  type?: '专注' | '学习' | '行政' | '复盘' | null
  engagement?: number | null
  energy?: '↑ 上升' | '→ 持平' | '↓ 下降' | null
  interruption?: '无' | '内部' | '外部' | null
  result_note?: string | null
  scene?: '🏠 在家' | '☕ 公共空间' | '👥 有人陪' | '🚶 外出独处' | null
  trigger?: string | null
}
