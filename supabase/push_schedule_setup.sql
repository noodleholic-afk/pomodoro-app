-- ── Step 1: Create push_schedule table ─────────────────────────────────────
create table if not exists public.push_schedule (
  id         uuid        primary key default gen_random_uuid(),
  subscription jsonb     not null,
  fire_at    timestamptz not null,
  phase      text        not null default 'work',
  sent       boolean     not null default false,
  created_at timestamptz default now()
);

-- ── Step 2: Allow the app (anon key) to insert/delete its own rows ──────────
-- No RLS needed: data is non-sensitive, edge function uses service role key.
alter table public.push_schedule disable row level security;

-- ── Step 3: Auto-delete rows older than 2 hours to keep table clean ─────────
-- (run this once; requires pg_cron which you will enable in Step 5 below)

-- ── Step 4: pg_cron job — calls fire-pushes edge function every minute ──────
-- Replace SERVICE_ROLE_KEY below with your actual key from:
--   Supabase Dashboard → Project Settings → API → service_role key
-- Replace the URL with your project URL (already shown below for your project)

select cron.schedule(
  'fire-pushes-every-minute',
  '* * * * *',
  $$
  select net.http_post(
    url     := 'https://klghimbqdnabtwncxsnm.supabase.co/functions/v1/fire-pushes',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer REPLACE_WITH_SERVICE_ROLE_KEY'
    ),
    body    := '{}'::jsonb
  )
  $$
);
