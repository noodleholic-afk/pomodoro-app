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
    // Re-use existing subscription if any
    let sub = await reg.pushManager.getSubscription()
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })
    }
    pushSubscription = sub
    return sub
  } catch (err) {
    console.error('[push] subscribe failed', err)
    return null
  }
}

/** Schedule a server-side push at `fireAt` (ISO string). */
export async function schedulePush(fireAt: string, phase: string): Promise<void> {
  await cancelPush() // always clean up previous

  const sub = await getSubscription()
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
    return
  }
  scheduleRowId = data?.id ?? null
}

/** Cancel a pending server push (called on pause/reset). */
export async function cancelPush(): Promise<void> {
  if (!scheduleRowId) return
  const id = scheduleRowId
  scheduleRowId = null
  await supabase.from('push_schedule').delete().eq('id', id)
}
