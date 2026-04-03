-- Add 15 Salesforce/HubSpot-inspired fields to crm_companies
ALTER TABLE crm_companies ADD COLUMN IF NOT EXISTS annual_revenue NUMERIC DEFAULT 0;
ALTER TABLE crm_companies ADD COLUMN IF NOT EXISTS employee_count INTEGER DEFAULT 0;
ALTER TABLE crm_companies ADD COLUMN IF NOT EXISTS founded_year INTEGER;
ALTER TABLE crm_companies ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'JP';
ALTER TABLE crm_companies ADD COLUMN IF NOT EXISTS city TEXT DEFAULT '';
ALTER TABLE crm_companies ADD COLUMN IF NOT EXISTS postal_code TEXT DEFAULT '';
ALTER TABLE crm_companies ADD COLUMN IF NOT EXISTS linkedin_url TEXT DEFAULT '';
ALTER TABLE crm_companies ADD COLUMN IF NOT EXISTS facebook_url TEXT DEFAULT '';
ALTER TABLE crm_companies ADD COLUMN IF NOT EXISTS twitter_handle TEXT DEFAULT '';
ALTER TABLE crm_companies ADD COLUMN IF NOT EXISTS parent_company_id UUID REFERENCES crm_companies(id) ON DELETE SET NULL;
ALTER TABLE crm_companies ADD COLUMN IF NOT EXISTS company_type TEXT DEFAULT '' CHECK (company_type IN ('', 'prospect', 'customer', 'partner', 'vendor', 'competitor', 'other'));
ALTER TABLE crm_companies ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT '' CHECK (tier IN ('', 'enterprise', 'mid_market', 'smb', 'startup'));
ALTER TABLE crm_companies ADD COLUMN IF NOT EXISTS last_activity_date TIMESTAMPTZ;
ALTER TABLE crm_companies ADD COLUMN IF NOT EXISTS lifecycle_stage TEXT DEFAULT '' CHECK (lifecycle_stage IN ('', 'subscriber', 'lead', 'mql', 'sql', 'opportunity', 'customer', 'evangelist'));
ALTER TABLE crm_companies ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '';
