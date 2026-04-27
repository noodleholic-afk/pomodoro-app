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

    const authHeader = req.headers.get('Authorization')
    const { data: { user } } = await supabase.auth.getUser(authHeader?.replace('Bearer ', '') || '')
    if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: CORS })

    const { data: settings } = await supabase
      .from('user_settings')
      .select('notion_token, notion_para_db')
      .eq('user_id', user.id)
      .single()

    if (!settings?.notion_token) {
      return new Response(JSON.stringify({ tasks: [] }), { headers: { ...CORS, 'Content-Type': 'application/json' } })
    }

    const dbId = settings.notion_para_db || 'c3c35753-55bb-838e-9a9a-070004b77420'

    const res = await fetch(`https://api.notion.com/v1/databases/${dbId}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${settings.notion_token}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28',
      },
      body: JSON.stringify({
        filter: { property: 'Status', status: { equals: 'In Progress' } },
        sorts: [{ timestamp: 'last_edited_time', direction: 'descending' }],
        page_size: 5,
      }),
    })

    const data = await res.json()
    const tasks = (data.results || []).map((page: any) => {
      const nameProp = page.properties['任务名称'] || page.properties['Name'] || page.properties['名称']
      const areaProp = page.properties['🗺️ 所属领域'] || page.properties['Area']
      return {
        id: page.id,
        name: nameProp?.title?.[0]?.plain_text || '(无标题)',
        area: areaProp?.select?.name || areaProp?.rich_text?.[0]?.plain_text || '',
      }
    })

    return new Response(JSON.stringify({ tasks }), { headers: { ...CORS, 'Content-Type': 'application/json' } })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: CORS })
  }
})
