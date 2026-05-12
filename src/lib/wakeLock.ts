/**
 * Screen Wake Lock — keep the display on while the timer is running.
 *
 * - iOS 16.4+ / modern Chrome/Safari/Edge.
 * - Browser auto-releases the lock when the tab becomes hidden, so we
 *   re-acquire it via a visibilitychange listener.
 */

let wakeLock: WakeLockSentinel | null = null

export async function requestWakeLock(): Promise<void> {
  if (!('wakeLock' in navigator)) return
  if (wakeLock) return
  try {
    wakeLock = await navigator.wakeLock.request('screen')
    wakeLock.addEventListener('release', () => {
      // Browser may release on its own — clear our reference so we can re-request
      wakeLock = null
    })
  } catch (err) {
    console.warn('[wakeLock] request failed', err)
  }
}

export async function releaseWakeLock(): Promise<void> {
  if (!wakeLock) return
  try { await wakeLock.release() } catch { /* ignore */ }
  wakeLock = null
}

export function isWakeLockActive(): boolean {
  return wakeLock !== null
}

// Re-acquire lock when the tab becomes visible again, but only if we
// "wanted" it (set via setWakeLockDesired). Without this guard we'd
// re-lock the screen even after the user paused/finished.
let desired = false
export function setWakeLockDesired(on: boolean) {
  desired = on
  if (on) requestWakeLock()
  else releaseWakeLock()
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && desired && !wakeLock) {
      requestWakeLock()
    }
  })
}
