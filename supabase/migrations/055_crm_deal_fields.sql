-- 055_crm_deal_fields.sql
-- Extend crm_deals with TCV/ACV/MRR amount model + forecast fields.
-- Existing `amount` column is kept for backwards compat; app layer now writes
-- TCV to both `tcv` and `amount` on save. Future migration will drop `amount`.

ALTER TABLE crm_deals
  ADD COLUMN IF NOT EXISTS deal_type TEXT NOT NULL DEFAULT 'spot'
    CHECK (deal_type IN ('spot', 'retainer', 'hybrid')),
  ADD COLUMN IF NOT EXISTS one_time_amount NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS monthly_recurring_amount NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS contract_term_months INTEGER,
  ADD COLUMN IF NOT EXISTS contract_start_date DATE,
  ADD COLUMN IF NOT EXISTS tcv NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS acv NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS next_action TEXT,
  ADD COLUMN IF NOT EXISTS next_action_date DATE,
  ADD COLUMN IF NOT EXISTS last_contact_date DATE,
  ADD COLUMN IF NOT EXISTS decision_maker_role TEXT,
  ADD COLUMN IF NOT EXISTS pain_point TEXT,
  ADD COLUMN IF NOT EXISTS competitor TEXT,
  ADD COLUMN IF NOT EXISTS forecast_category TEXT NOT NULL DEFAULT 'pipeline'
    CHECK (forecast_category IN ('commit', 'best_case', 'pipeline', 'omitted')),
  ADD COLUMN IF NOT EXISTS stage_changed_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS reopen_count INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN crm_deals.amount IS
  'DEPRECATED: use tcv. Kept for backwards compatibility; mirrored from tcv on save.';

-- Backfill from existing amount into the new canonical TCV column.
-- Assume every existing deal is a spot one-time for safety; user will reclassify in UI.
UPDATE crm_deals
SET
  tcv = COALESCE(amount, 0),
  one_time_amount = COALESCE(amount, 0),
  monthly_recurring_amount = 0,
  contract_term_months = 0,
  acv = 0,
  deal_type = 'spot',
  stage_changed_at = updated_at,
  forecast_category = CASE
    WHEN stage = 'won' THEN 'commit'
    WHEN stage IN ('lost', 'churned') THEN 'omitted'
    ELSE 'pipeline'
  END
WHERE tcv = 0 OR tcv IS NULL;

CREATE INDEX IF NOT EXISTS idx_crm_deals_forecast_category
  ON crm_deals(forecast_category);
CREATE INDEX IF NOT EXISTS idx_crm_deals_stage_changed_at
  ON crm_deals(stage_changed_at);
CREATE INDEX IF NOT EXISTS idx_crm_deals_next_action_date
  ON crm_deals(next_action_date);
