-- CRM Feature - Core Tables
-- Migration: 031_create_crm.sql

-- 1. Companies
CREATE TABLE IF NOT EXISTS crm_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  domain TEXT DEFAULT '',
  industry TEXT DEFAULT '',
  company_size TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  website TEXT DEFAULT '',
  address TEXT DEFAULT '',
  description TEXT DEFAULT '',
  owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
  source TEXT DEFAULT '',
  tags JSONB DEFAULT '[]'::jsonb,
  custom_fields JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_companies_owner ON crm_companies(owner_id);
CREATE INDEX IF NOT EXISTS idx_crm_companies_client ON crm_companies(client_id);

-- 2. Contacts
CREATE TABLE IF NOT EXISTS crm_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES crm_companies(id) ON DELETE SET NULL,
  first_name TEXT NOT NULL DEFAULT '',
  last_name TEXT NOT NULL DEFAULT '',
  email TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  title TEXT DEFAULT '',
  department TEXT DEFAULT '',
  linkedin_url TEXT DEFAULT '',
  description TEXT DEFAULT '',
  owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
  lifecycle_stage TEXT DEFAULT 'subscriber',
  lead_status TEXT DEFAULT 'new',
  lead_score INTEGER DEFAULT 0,
  source TEXT DEFAULT '',
  last_contacted_at TIMESTAMPTZ,
  tags JSONB DEFAULT '[]'::jsonb,
  custom_fields JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_contacts_company ON crm_contacts(company_id);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_owner ON crm_contacts(owner_id);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_email ON crm_contacts(email) WHERE email != '';
CREATE INDEX IF NOT EXISTS idx_crm_contacts_lifecycle ON crm_contacts(lifecycle_stage);

-- 3. Deals (created before leads so leads can reference it)
CREATE TABLE IF NOT EXISTS crm_deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  company_id UUID REFERENCES crm_companies(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES crm_contacts(id) ON DELETE SET NULL,
  lead_id UUID,
  pipeline_opportunity_id UUID,
  project_id UUID,
  stage TEXT DEFAULT 'proposal',
  amount NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'JPY',
  probability INTEGER DEFAULT 0,
  expected_close_date DATE,
  actual_close_date DATE,
  owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
  loss_reason TEXT DEFAULT '',
  priority TEXT DEFAULT 'medium',
  description TEXT DEFAULT '',
  tags JSONB DEFAULT '[]'::jsonb,
  custom_fields JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_deals_company ON crm_deals(company_id);
CREATE INDEX IF NOT EXISTS idx_crm_deals_stage ON crm_deals(stage);
CREATE INDEX IF NOT EXISTS idx_crm_deals_owner ON crm_deals(owner_id);
CREATE INDEX IF NOT EXISTS idx_crm_deals_close_date ON crm_deals(expected_close_date);

-- 4. Leads (after deals, can reference converted_deal_id)
CREATE TABLE IF NOT EXISTS crm_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES crm_contacts(id) ON DELETE CASCADE,
  company_id UUID REFERENCES crm_companies(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  status TEXT DEFAULT 'new',
  source TEXT DEFAULT '',
  estimated_value NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'JPY',
  owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
  converted_deal_id UUID REFERENCES crm_deals(id) ON DELETE SET NULL,
  converted_at TIMESTAMPTZ,
  expected_close_date DATE,
  description TEXT DEFAULT '',
  tags JSONB DEFAULT '[]'::jsonb,
  custom_fields JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_leads_contact ON crm_leads(contact_id);
CREATE INDEX IF NOT EXISTS idx_crm_leads_status ON crm_leads(status);
CREATE INDEX IF NOT EXISTS idx_crm_leads_owner ON crm_leads(owner_id);

-- Add lead_id FK to deals now that leads table exists
ALTER TABLE crm_deals ADD CONSTRAINT crm_deals_lead_fk FOREIGN KEY (lead_id) REFERENCES crm_leads(id) ON DELETE SET NULL;

-- Add optional FK references (may not exist in all setups)
DO $$ BEGIN
  ALTER TABLE crm_deals ADD CONSTRAINT crm_deals_pipeline_fk FOREIGN KEY (pipeline_opportunity_id) REFERENCES pipeline_opportunities(id) ON DELETE SET NULL;
EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE crm_deals ADD CONSTRAINT crm_deals_project_fk FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- 5. Deal Items
CREATE TABLE IF NOT EXISTS crm_deal_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES crm_deals(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  quantity NUMERIC DEFAULT 1,
  unit_price NUMERIC DEFAULT 0,
  discount_percent NUMERIC DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_deal_items_deal ON crm_deal_items(deal_id);

-- 6. Activities
CREATE TABLE IF NOT EXISTS crm_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  activity_type TEXT NOT NULL,
  subject TEXT DEFAULT '',
  body TEXT DEFAULT '',
  outcome TEXT DEFAULT '',
  scheduled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_minutes INTEGER,
  is_completed BOOLEAN DEFAULT false,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_activities_entity ON crm_activities(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_crm_activities_user ON crm_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_crm_activities_type ON crm_activities(activity_type);

-- 7. Import Logs
CREATE TABLE IF NOT EXISTS crm_import_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL DEFAULT 'csv',
  entity_type TEXT NOT NULL DEFAULT 'contact',
  file_name TEXT DEFAULT '',
  total_rows INTEGER DEFAULT 0,
  imported_rows INTEGER DEFAULT 0,
  skipped_rows INTEGER DEFAULT 0,
  error_rows INTEGER DEFAULT 0,
  error_details JSONB DEFAULT '[]'::jsonb,
  field_mapping JSONB DEFAULT '{}'::jsonb,
  user_id UUID NOT NULL REFERENCES users(id),
  status TEXT DEFAULT 'pending',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_import_logs_user ON crm_import_logs(user_id);

-- RLS (simple authenticated access for MVP)
ALTER TABLE crm_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_deal_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_import_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "crm_companies_all" ON crm_companies FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "crm_contacts_all" ON crm_contacts FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "crm_leads_all" ON crm_leads FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "crm_deals_all" ON crm_deals FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "crm_deal_items_all" ON crm_deal_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "crm_activities_all" ON crm_activities FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "crm_import_logs_all" ON crm_import_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);
