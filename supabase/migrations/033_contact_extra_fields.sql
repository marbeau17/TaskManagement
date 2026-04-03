-- Add extra fields to crm_contacts (Salesforce/HubSpot inspired)
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS mobile_phone TEXT DEFAULT '';
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS address TEXT DEFAULT '';
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS preferred_language TEXT DEFAULT 'ja';
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS last_activity_date TIMESTAMPTZ;
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS decision_maker BOOLEAN DEFAULT false;
