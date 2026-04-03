-- CRM Forms — HubSpot-style form builder
-- Migration: 032_create_crm_forms.sql

-- 1. Form definitions (created by admin)
CREATE TABLE IF NOT EXISTS crm_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  fields JSONB NOT NULL DEFAULT '[]'::jsonb,  -- Array of field definitions
  settings JSONB DEFAULT '{}'::jsonb,          -- redirect_url, notification_email, thank_you_message, etc.
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
  submit_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_forms_status ON crm_forms(status);

-- 2. Form submissions (from external/internal sources)
CREATE TABLE IF NOT EXISTS crm_form_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES crm_forms(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES crm_contacts(id) ON DELETE SET NULL,  -- linked CRM contact
  data JSONB NOT NULL DEFAULT '{}'::jsonb,    -- submitted field values
  source_url TEXT DEFAULT '',                  -- page URL where form was submitted
  ip_address TEXT DEFAULT '',
  user_agent TEXT DEFAULT '',
  utm_source TEXT DEFAULT '',
  utm_medium TEXT DEFAULT '',
  utm_campaign TEXT DEFAULT '',
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'spam')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_submissions_form ON crm_form_submissions(form_id);
CREATE INDEX IF NOT EXISTS idx_crm_submissions_contact ON crm_form_submissions(contact_id);
CREATE INDEX IF NOT EXISTS idx_crm_submissions_created ON crm_form_submissions(created_at DESC);

-- RLS
ALTER TABLE crm_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_form_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crm_forms_all" ON crm_forms FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "crm_submissions_all" ON crm_form_submissions FOR ALL TO authenticated USING (true) WITH CHECK (true);
