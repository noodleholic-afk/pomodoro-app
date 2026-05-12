/**
 * Web Push (VAPID) module.
 *
 * Flow:
 * 1. User grants Notification permission.
 * 2. Browser subscribes to push service → PushSubscription object.
 * 3. On START: POST subscription + fire_at to Supabase `push_schedule` table.
 * 4. On PAUSE/RESET: DELETE the row (cancel pending push).
 * 5. Supabase pg_cron calls edge fn `fire-pushes` every minute.
 *    The edge fn sends web-push to any subscriptions whose fire_at has passed.
 */

import { supabase } from './supabase'

// Set by Vite from .env.local  VITE_VAPID_PUBLIC_KEY
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)))
}

let pushSubscription: PushSubscription | null = null
let scheduleRowId: string | null = null
let lastSubError: string = ''

/** Get (or create) the push subscription. Returns null if unsupported/denied. */
async function getSubscription(): Promise<PushSubscription | null> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return null
  if (!VAPID_PUBLIC_KEY) {
    console.warn('[push] VITE_VAPID_PUBLIC_KEY not set — server push disabled')
    return null
  }
  if (pushSubscription) return pushSubscription

  try {
    const reg = await navigator.serviceWorker.ready
    lastSubError = `key.len=${VAPID_PUBLIC_KEY.length} key.head=${VAPID_PUBLIC_KEY.slice(0, 8)}...`
    // Try to retrieve existing subscription; iOS may throw if a stale/bad one is cached
    let sub: PushSubscription | null = null
    try {
      sub = await reg.pushManager.getSubscription()
      // If the existing subscription's key doesn't match current VAPID, drop it
      if (sub) {
        try { await sub.unsubscribe(); sub = null; lastSubError += ' | dropped stale sub' } catch {}
      }
    } catch (e: any) {
      lastSubError = `getSubscription() threw ${e?.name}: ${e?.message} — trying fresh subscribe`
      sub = null
    }
    if (!sub) {
      // Build a proper ArrayBuffer (not just a Uint8Array view)
      let keyBuffer: ArrayBuffer
      try {
        const u8 = urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
        keyBuffer = u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength) as ArrayBuffer
        lastSubError += ` | decoded ${u8.length}B`
      } catch (e: any) {
        lastSubError = `decode: ${e?.name || ''} ${e?.message || String(e)} | key=${VAPID_PUBLIC_KEY}`
        throw e
      }
      try {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: keyBuffer,
        })
      } catch (e: any) {
        lastSubError = `subscribe(): ${e?.name || ''} ${e?.message || String(e)} | key.len=${VAPID_PUBLIC_KEY.length} bufLen=${keyBuffer.byteLength}`
        throw e
      }
    } else {
      lastSubError = 'existing subscription reused'
    }
    pushSubscription = sub
    return sub
  } catch (err: any) {
    console.error('[push] subscribe failed', err)
    if (!lastSubError.includes('subscribe()')) {
      lastSubError = `outer: ${err?.name || ''} ${err?.message || String(err)}`
    }
    return null
  }
}

export function getLastSubError(): string { return lastSubError }

/** Schedule a server-side push at `fireAt` (ISO string). */
export async function schedulePush(fireAt: string, phase: string): Promise<void> {
  await cancelPush() // always clean up previous

  // DEBUG: show push subscription status
  const notifSupported = 'Notification' in window
  const notifPerm = notifSupported ? Notification.permission : 'N/A'
  const swSupported = 'serviceWorker' in navigator
  const pushSupported = 'PushManager' in window
  const hasVapid = !!VAPID_PUBLIC_KEY

  const sub = await getSubscription()

  alert(`[DEBUG Push]\nNotification: ${notifSupported} (${notifPerm})\nSW: ${swSupported}\nPushManager: ${pushSupported}\nVAPID key: ${hasVapid}\nSubscription: ${sub ? 'OK' : 'FAILED'}\n\nLast error / info:\n${lastSubError}`)

  if (!sub) return

  const { data, error } = await supabase
    .from('push_schedule')
    .insert({
      subscription: sub.toJSON(),
      fire_at: fireAt,
      phase,
    })
    .select('id')
    .single()

  if (error) {
    console.error('[push] schedulePush error', error)
    alert(`[DEBUG Push] DB insert error: ${error.message}`)
    return
  }
  scheduleRowId = data?.id ?? null
  alert(`[DEBUG Push] Scheduled! fire_at=${fireAt}, row=${scheduleRowId}`)
}

/** Cancel a pending server push (called on pause/reset). */
export async function cancelPush(): Promise<void> {
  if (!scheduleRowId) return
  const id = scheduleRowId
  scheduleRowId = null
  await supabase.from('push_schedule').delete().eq('id', id)
}
