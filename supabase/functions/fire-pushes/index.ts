/**
 * fire-pushes — Supabase Edge Function
 *
 * Called by pg_cron every minute.
 * Finds all push_schedule rows where fire_at <= now() and sent = false,
 * sends a Web Push notification to each, then marks them sent.
 *
 * Required Supabase secrets (set via dashboard → Project Settings → Edge Functions → Secrets):
 *   VAPID_PUBLIC_KEY   — base64url public key from `npx web-push generate-vapid-keys`
 *   VAPID_PRIVATE_KEY  — base64url private key
 *   VAPID_SUBJECT      — mailto:your@email.com
 */

import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

webpush.setVapidDetails(
  Deno.env.get('VAPID_SUBJECT')!,
  Deno.env.get('VAPID_PUBLIC_KEY')!,
  Deno.env.get('VAPID_PRIVATE_KEY')!,
)

Deno.serve(async (_req) => {
  // Fetch all pending pushes that are due
  const { data: rows, error } = await supabase
    .from('push_schedule')
    .select('*')
    .eq('sent', false)
    .lte('fire_at', new Date().toISOString())

  if (error) {
    console.error('push_schedule query error', error)
    return new Response('error', { status: 500 })
  }
  if (!rows || rows.length === 0) {
    return new Response('ok (none)', { status: 200 })
  }

  const results = await Promise.allSettled(
    rows.map(async (row: any) => {
      const isWork = row.phase === 'work'
      const payload = JSON.stringify({
        title: isWork ? '🍅 番茄结束！' : '☕ 休息结束！',
        body:  isWork ? '做得好，休息一下吧～' : '准备好开始下一个番茄了吗？',
      })
      await webpush.sendNotification(row.subscription, payload)
      await supabase.from('push_schedule').update({ sent: true }).eq('id', row.id)
    })
  )

  const failed = results.filter(r => r.status === 'rejected')
  if (failed.length > 0) {
    console.error('Some pushes failed:', failed)
  }

  return new Response(`ok (sent ${rows.length - failed.length}/${rows.length})`, { status: 200 })
})
