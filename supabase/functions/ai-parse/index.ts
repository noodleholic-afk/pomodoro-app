import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SYSTEM_PROMPT = `你是一个番茄工作法记录助手。用户会用一句话描述刚完成的番茄时段。
请从中提取以下字段，以 JSON 格式返回，缺少的字段用 null：

{
  "task_name": "任务名（如果用户修正了任务名）",
  "type": "专注|学习|行政|复盘",
  "engagement": 1到5之间的数字,
  "energy": "↑ 上升|→ 持平|↓ 下降",
  "interruption": "无|内部|外部",
  "result_note": "用户描述的结果/进展",
  "scene": "🏠 在家|☕ 公共空间|👥 有人陪|🚶 外出独处",
  "trigger": "导致能量变化的原因（如果提到）"
}

注意：
- "比较投入"≈4，"非常投入"≈5，"一般"≈3，"不太投入"≈2，"完全没投入"≈1
- "能量上升/好了/舒服"→"↑ 上升"，"没变化/还行"→"→ 持平"，"累了/消耗大"→"↓ 下降"
- 如果用户没提到某个字段，返回 null，不要猜
- 只返回 JSON，不要其他文字`

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const authHeader = req.headers.get('Authorization')
    const { data: { user } } = await supabase.auth.getUser(authHeader?.replace('Bearer ', '') || '')
    if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: CORS })

    const { data: settings } = await supabase
      .from('user_settings')
      .select('siliconflow_api_key, ai_model')
      .eq('user_id', user.id)
      .single()

    if (!settings?.siliconflow_api_key) {
      return new Response(JSON.stringify({ error: 'SiliconFlow API key not configured' }), { status: 400, headers: CORS })
    }

    const { text } = await req.json()
    const model = settings.ai_model || 'deepseek-ai/DeepSeek-V3.2'
    const fallbackModel = 'THUDM/glm-4-9b-chat'

    async function callAI(modelName: string) {
      const res = await fetch('https://api.siliconflow.cn/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${settings!.siliconflow_api_key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: modelName,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: text },
          ],
          temperature: 0.1,
          response_format: { type: 'json_object' },
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.json()
    }

    let result: any
    try {
      result = await callAI(model)
    } catch {
      result = await callAI(fallbackModel)
    }

    const content = result.choices?.[0]?.message?.content || '{}'
    const parsed = JSON.parse(content)

    return new Response(JSON.stringify(parsed), { headers: { ...CORS, 'Content-Type': 'application/json' } })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: CORS })
  }
})
