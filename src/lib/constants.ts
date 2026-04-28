import type { Phase } from '../types'

export const PHASE_DURATIONS: Record<Phase, number> = {
  'work': 25 * 60,
  'short-break': 5 * 60,
  'long-break': 15 * 60,
}

export const POMODOROS_BEFORE_LONG_BREAK = 4

export const NOTION_REPORT_DB = '6894953a-39e9-4ef6-929e-38fd0766b995'
export const NOTION_GOODTIME_DB = 'b6f8a0ec-a13d-43c6-879c-68dc8b153042'
export const NOTION_PARA_DB = 'c3c35753-55bb-838e-9a9a-070004b77420'

export const AI_MODEL_PRIMARY = 'deepseek-ai/DeepSeek-V3.2'
export const AI_MODEL_FALLBACK = 'THUDM/glm-4-9b-chat'
