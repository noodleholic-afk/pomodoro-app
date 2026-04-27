import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Get auth user
    const authHeader = req.headers.get('Authorization')
    const { data: { user } } = await supabase.auth.getUser(authHeader?.replace('Bearer ', '') || '')
    if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: CORS })

    // Load user settings
    const { data: settings } = await supabase
      .from('user_settings')
      .select('notion_token, notion_report_db, notion_goodtime_db')
      .eq('user_id', user.id)
      .single()

    if (!settings?.notion_token) {
      return new Response(JSON.stringify({ error: 'Notion token not configured' }), { status: 400, headers: CORS })
    }

    const body = await req.json()
    const notionHeaders = {
      'Authorization': `Bearer ${settings.notion_token}`,
      'Content-Type': 'application/json',
      'Notion-Version': '2022-06-28',
    }

    const reportDbId = settings.notion_report_db || '6894953a-39e9-4ef6-929e-38fd0766b995'
    const goodtimeDbId = settings.notion_goodtime_db || 'b6f8a0ec-a13d-43c6-879c-68dc8b153042'

    // Build memo text
    const memoLines: string[] = []
    if (body.memo) memoLines.push(body.memo)
    if (body.interruptions_urgent?.length) {
      memoLines.push('【计划外紧急】')
      body.interruptions_urgent.forEach((t: string) => memoLines.push(`• ${t}`))
    }
    if (body.interruptions_memo?.length) {
      memoLines.push('【活动备忘】')
      body.interruptions_memo.forEach((t: string) => memoLines.push(`• ${t}`))
    }

    // Write to 番茄战报
    const reportProps: Record<string, unknown> = {
      '战报名称': { title: [{ text: { content: body.task_name || '番茄' } }] },
      '时长(分钟)': { number: body.duration || 25 },
    }
    if (body.type) reportProps['类型'] = { select: { name: body.type } }
    if (body.engagement) reportProps['投入程度(1-5)'] = { number: body.engagement }
    if (body.energy) reportProps['能量变化'] = { select: { name: body.energy } }
    if (body.interruption) reportProps['中断'] = { select: { name: body.interruption } }
    if (body.result_note) reportProps['结果一句话'] = { rich_text: [{ text: { content: body.result_note } }] }
    if (memoLines.length) reportProps['备忘'] = { rich_text: [{ text: { content: memoLines.join('\n') } }] }
    if (body.task_id) reportProps['PARA+🍅 关联条目'] = { relation: [{ id: body.task_id }] }

    const reportRes = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: notionHeaders,
      body: JSON.stringify({ parent: { database_id: reportDbId }, properties: reportProps }),
    })
    const reportPage = await reportRes.json()

    // Write to 好时光日志 (only if engagement or energy provided)
    if (body.engagement || body.energy) {
      const goodtimeProps: Record<string, unknown> = {
        '记录': { title: [{ text: { content: `🍅 ${body.task_name || '番茄'}` } }] },
        '时间': { date: { start: body.started_at } },
      }
      if (body.result_note) goodtimeProps['做了什么'] = { rich_text: [{ text: { content: body.result_note } }] }
      if (body.engagement) goodtimeProps['投入程度(1-5)'] = { number: body.engagement }
      if (body.energy) goodtimeProps['能量变化'] = { select: { name: body.energy } }
      if (body.scene) goodtimeProps['场景'] = { select: { name: body.scene } }
      if (body.trigger) goodtimeProps['触发因素（因为____）'] = { rich_text: [{ text: { content: body.trigger } }] }
      if (reportPage.id) goodtimeProps['🍅 番茄战报库'] = { relation: [{ id: reportPage.id }] }

      await fetch('https://api.notion.com/v1/pages', {
        method: 'POST',
        headers: notionHeaders,
        body: JSON.stringify({ parent: { database_id: goodtimeDbId }, properties: goodtimeProps }),
      })
    }

    return new Response(JSON.stringify({ success: true, reportId: reportPage.id }), { headers: { ...CORS, 'Content-Type': 'application/json' } })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: CORS })
  }
})
