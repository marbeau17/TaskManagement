-- Access domain control per user
ALTER TABLE users ADD COLUMN IF NOT EXISTS access_domains JSONB DEFAULT '["tasks","issues","projects","workload","chat","reports"]'::jsonb;

-- LINE integration settings (for CRM)
CREATE TABLE IF NOT EXISTS app_line_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_access_token TEXT DEFAULT '',
  channel_secret TEXT DEFAULT '',
  webhook_url TEXT DEFAULT '',
  rich_menu_id TEXT DEFAULT '',
  greeting_message TEXT DEFAULT 'ご登録ありがとうございます！',
  is_active BOOLEAN DEFAULT false,
  updated_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE app_line_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "line_settings_admin" ON app_line_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Seed default LINE settings row
INSERT INTO app_line_settings (greeting_message)
VALUES ('ご登録ありがとうございます！お気軽にお問い合わせください。')
ON CONFLICT DO NOTHING;
