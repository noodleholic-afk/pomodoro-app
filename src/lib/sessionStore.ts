/**
 * Session Store — single source of truth for cross-screen state.
 *
 * Keys:
 *   active_session        → { taskName, area, taskId, startedAt }
 *   current_session_urgent → [{ id, text, pushed }]
 *   current_session_memo   → [{ id, text, pushed }]
 *   today_tasks           → [{ id, text, done }]  (managed by StartScreen)
 */

export interface SessionNote {
  id: string
  text: string
  pushed: boolean   // true = already pushed to TODAY'S TASKS
  createdAt: string
}

export interface ActiveSession {
  taskName: string
  area: string      // e.g. "🔍 求职"
  taskId: string
  startedAt: string
}

const KEYS = {
  session: 'active_session',
  urgent:  'current_session_urgent',
  memo:    'current_session_memo',
} as const

// ─── Active Session ───

export function loadActiveSession(): ActiveSession | null {
  try {
    const raw = localStorage.getItem(KEYS.session)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

export function saveActiveSession(s: ActiveSession): void {
  try { localStorage.setItem(KEYS.session, JSON.stringify(s)) } catch {}
}

export function clearActiveSession(): void {
  localStorage.removeItem(KEYS.session)
}

// ─── Urgent / Memo ───

export function loadUrgent(): SessionNote[] {
  try {
    return JSON.parse(localStorage.getItem(KEYS.urgent) || '[]')
  } catch { return [] }
}

export function saveUrgent(items: SessionNote[]): void {
  try { localStorage.setItem(KEYS.urgent, JSON.stringify(items)) } catch {}
}

export function loadMemo(): SessionNote[] {
  try {
    return JSON.parse(localStorage.getItem(KEYS.memo) || '[]')
  } catch { return [] }
}

export function saveMemo(items: SessionNote[]): void {
  try { localStorage.setItem(KEYS.memo, JSON.stringify(items)) } catch {}
}

export function clearNotes(): void {
  localStorage.removeItem(KEYS.urgent)
  localStorage.removeItem(KEYS.memo)
}

/** Clear everything (RESTART) */
export function clearAll(): void {
  clearActiveSession()
  clearNotes()
}
