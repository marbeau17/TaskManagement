-- Marketing Automation — Campaigns, Recipients, Contact Source Tracking
-- Migration: 035_create_marketing.sql

-- 1. Add source tracking fields to crm_contacts
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS source_channel TEXT DEFAULT '';
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS source_detail TEXT DEFAULT '';
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS first_touch_date TIMESTAMPTZ;
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS first_touch_channel TEXT DEFAULT '';
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS utm_source TEXT DEFAULT '';
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS utm_medium TEXT DEFAULT '';
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS utm_campaign TEXT DEFAULT '';
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS email_opt_in BOOLEAN DEFAULT true;
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS line_opt_in BOOLEAN DEFAULT true;
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS line_user_id TEXT DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_crm_contacts_source ON crm_contacts(source_channel);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_line ON crm_contacts(line_user_id) WHERE line_user_id != '';

-- 2. Campaigns
CREATE TABLE IF NOT EXISTS crm_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  campaign_type TEXT NOT NULL DEFAULT 'email',
  status TEXT DEFAULT 'draft',
  subject TEXT DEFAULT '',
  content JSONB DEFAULT '{}'::jsonb,
  target_segment JSONB DEFAULT '{}'::jsonb,
  target_count INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  open_count INTEGER DEFAULT 0,
  click_count INTEGER DEFAULT 0,
  bounce_count INTEGER DEFAULT 0,
  unsubscribe_count INTEGER DEFAULT 0,
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_campaigns_status ON crm_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_crm_campaigns_type ON crm_campaigns(campaign_type);

-- 3. Campaign Recipients
CREATE TABLE IF NOT EXISTS crm_campaign_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES crm_campaigns(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES crm_contacts(id) ON DELETE CASCADE,
  channel TEXT DEFAULT 'email',
  status TEXT DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  UNIQUE(campaign_id, contact_id)
);

CREATE INDEX IF NOT EXISTS idx_crm_recipients_campaign ON crm_campaign_recipients(campaign_id);
CREATE INDEX IF NOT EXISTS idx_crm_recipients_contact ON crm_campaign_recipients(contact_id);

-- 4. Saved Segments
CREATE TABLE IF NOT EXISTS crm_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  contact_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE crm_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_campaign_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_segments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crm_campaigns_all" ON crm_campaigns FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "crm_recipients_all" ON crm_campaign_recipients FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "crm_segments_all" ON crm_segments FOR ALL TO authenticated USING (true) WITH CHECK (true);
