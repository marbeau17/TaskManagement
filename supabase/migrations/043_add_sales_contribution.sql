-- Add sales contribution percentage to leads and deals
-- Tracks how much a salesperson contributed to the deal (0-100%)

ALTER TABLE crm_leads
ADD COLUMN IF NOT EXISTS sales_contribution INTEGER DEFAULT 0 CHECK (sales_contribution BETWEEN 0 AND 100);

ALTER TABLE crm_deals
ADD COLUMN IF NOT EXISTS sales_contribution INTEGER DEFAULT 0 CHECK (sales_contribution BETWEEN 0 AND 100);
