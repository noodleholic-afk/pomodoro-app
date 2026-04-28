-- Pomodoro Sessions Table
CREATE TABLE pomodoro_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,

  phase TEXT NOT NULL DEFAULT 'work',
  total_seconds INTEGER NOT NULL DEFAULT 1500,
  end_time TIMESTAMPTZ,
  pause_remaining INTEGER,
  completed_count INTEGER NOT NULL DEFAULT 0,

  task_name TEXT,
  task_id TEXT,
  area TEXT,

  interruptions_urgent JSONB DEFAULT '[]',
  interruptions_memo JSONB DEFAULT '[]',

  started_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id)
);

ALTER PUBLICATION supabase_realtime ADD TABLE pomodoro_sessions;

ALTER TABLE pomodoro_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own sessions" ON pomodoro_sessions
  FOR ALL USING (auth.uid() = user_id);

-- User Settings Table
CREATE TABLE user_settings (
  user_id UUID REFERENCES auth.users(id) PRIMARY KEY,
  notion_token TEXT,
  notion_report_db TEXT DEFAULT '6894953a-39e9-4ef6-929e-38fd0766b995',
  notion_goodtime_db TEXT DEFAULT 'b6f8a0ec-a13d-43c6-879c-68dc8b153042',
  notion_para_db TEXT DEFAULT 'c3c35753-55bb-838e-9a9a-070004b77420',
  siliconflow_api_key TEXT,
  ai_model TEXT DEFAULT 'deepseek-ai/DeepSeek-V3.2',
  sound_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own settings" ON user_settings
  FOR ALL USING (auth.uid() = user_id);
