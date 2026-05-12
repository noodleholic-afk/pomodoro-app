/**
 * Notification module for Pomodoro timer end alerts.
 *
 * Scheduling strategy:
 * - Uses a single setTimeout keyed to the remaining seconds.
 * - Works when the app is in foreground or backgrounded (screen on, tab hidden).
 * - On iOS lock screen: JS is frozen → timeout won't fire. This is a known
 *   platform limitation for PWAs without a server-side push backend.
 *
 * Usage:
 *   requestNotificationPermission()  — call once from a user-gesture handler
 *   scheduleNotification(rem, phase) — replace any existing scheduled notification
 *   cancelNotification()             — on pause / reset / phase skip
 */

let notificationTimer: ReturnType<typeof setTimeout> | null = null

export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  const result = await Notification.requestPermission()
  return result === 'granted'
}

export function scheduleNotification(remainingSeconds: number, phase: string) {
  cancelNotification()
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  if (remainingSeconds <= 0) return

  const isWork = phase === 'work'
  const title  = isWork ? '🍅 番茄结束！' : '☕ 休息结束！'
  const body   = isWork ? '做得好，休息一下吧～' : '准备好开始下一个番茄了吗？'

  notificationTimer = setTimeout(() => {
    try {
      new Notification(title, {
        body,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        silent: false,
      })
    } catch { /* Notification may be blocked */ }
    notificationTimer = null
  }, remainingSeconds * 1000)
}

export function cancelNotification() {
  if (notificationTimer !== null) {
    clearTimeout(notificationTimer)
    notificationTimer = null
  }
}
