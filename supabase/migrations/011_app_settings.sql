-- App settings table
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "app_settings: select" ON app_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "app_settings: manage" ON app_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Seed default settings
INSERT INTO app_settings (key, value) VALUES
  ('org_name', 'WorkFlow'),
  ('workload_warning_threshold', '80'),
  ('workload_danger_threshold', '100'),
  ('language', 'ja'),
  ('gemini_api_key', '')
ON CONFLICT (key) DO NOTHING;
