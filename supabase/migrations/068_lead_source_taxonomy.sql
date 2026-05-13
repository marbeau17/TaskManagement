-- 流入経路タクソノミー (12 チャネル) を構造化
-- 仕様: docs/lead_source_spec.md
-- - source_channel: 12 値の enum 相当 (アプリ層で制限)
-- - source_detail:  自由文字列
-- - first_* 系:     初回流入時の attribution、上書き禁止 (アプリ層で担保)

ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS source_channel TEXT;
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS source_detail TEXT;
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS first_utm_source TEXT;
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS first_utm_medium TEXT;
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS first_utm_campaign TEXT;
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS first_referrer_url TEXT;
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS first_landing_url TEXT;
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS first_seen_at TIMESTAMPTZ;

ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS source_channel TEXT;
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS source_detail TEXT;
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS first_utm_source TEXT;
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS first_utm_medium TEXT;
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS first_utm_campaign TEXT;
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS first_referrer_url TEXT;
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS first_landing_url TEXT;
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS first_seen_at TIMESTAMPTZ;

ALTER TABLE crm_companies ADD COLUMN IF NOT EXISTS source_channel TEXT;
ALTER TABLE crm_companies ADD COLUMN IF NOT EXISTS source_detail TEXT;

-- 集計と絞り込み用のインデックス
CREATE INDEX IF NOT EXISTS idx_crm_contacts_source_channel ON crm_contacts(source_channel);
CREATE INDEX IF NOT EXISTS idx_crm_leads_source_channel ON crm_leads(source_channel);
CREATE INDEX IF NOT EXISTS idx_crm_companies_source_channel ON crm_companies(source_channel);
