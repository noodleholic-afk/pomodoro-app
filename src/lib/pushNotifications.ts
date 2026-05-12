/**
 * Web Push (VAPID) module — iOS PWA lock-screen notifications.
 *
 * Flow:
 * 1. User grants Notification permission on first user gesture.
 * 2. Browser subscribes to push service → PushSubscription object.
 * 3. On START / RESUME: POST subscription + fire_at to Supabase `push_schedule`.
 * 4. On PAUSE / RESET / phase change: DELETE the row (cancel pending push).
 * 5. Supabase pg_cron triggers the `fire-pushes` edge function every minute,
 *    which sends a web-push to any due subscriptions.
 */

import { supabase } from './supabase'

// Strip any non-base64url characters (BOM, zero-width, whitespace) that may
// have been introduced when the env var was set via shell tooling.
const VAPID_PUBLIC_KEY = (import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined)
  ?.replace(/[^A-Za-z0-9_\-]/g, '')

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
  const std    = padded.replace(/-/g, '+').replace(/_/g, '/')
  const raw    = atob(std)
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)))
}

let pushSubscription: PushSubscription | null = null
let scheduleRowId: string | null = null

async function getSubscription(): Promise<PushSubscription | null> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return null
  if (!VAPID_PUBLIC_KEY) return null
  if (pushSubscription) return pushSubscription

  try {
    const reg = await navigator.serviceWorker.ready
    // Drop any stale subscription (may have been created against an old key)
    try {
      const existing = await reg.pushManager.getSubscription()
      if (existing) await existing.unsubscribe()
    } catch { /* ignore */ }

    const u8 = urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    const keyBuffer = u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength) as ArrayBuffer
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: keyBuffer,
    })
    pushSubscription = sub
    return sub
  } catch (err) {
    console.error('[push] subscribe failed', err)
    return null
  }
}

/** Schedule a server-side push at `fireAt` (ISO string). */
export async function schedulePush(fireAt: string, phase: string): Promise<void> {
  await cancelPush()

  const sub = await getSubscription()
  if (!sub) return

  const { data, error } = await supabase
    .from('push_schedule')
    .insert({ subscription: sub.toJSON(), fire_at: fireAt, phase })
    .select('id')
    .single()

  if (error) {
    console.error('[push] schedulePush DB error', error)
    return
  }
  scheduleRowId = data?.id ?? null
}

/** Cancel a pending server push. */
export async function cancelPush(): Promise<void> {
  if (!scheduleRowId) return
  const id = scheduleRowId
  scheduleRowId = null
  await supabase.from('push_schedule').delete().eq('id', id)
}
