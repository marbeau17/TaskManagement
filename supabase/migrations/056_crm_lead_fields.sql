-- 056_crm_lead_fields.sql
-- Extend crm_leads with the same contract/forecast fields as crm_deals, plus
-- lead-only qualification fields. qualification_score is recomputed in app
-- layer (simpler than plpgsql given the 14-day date window on last_contact).

ALTER TABLE crm_leads
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
  ADD COLUMN IF NOT EXISTS reopen_count INTEGER NOT NULL DEFAULT 0,
  -- Lead-only qualification fields
  ADD COLUMN IF NOT EXISTS budget_range TEXT NOT NULL DEFAULT '未確認'
    CHECK (budget_range IN ('<100万', '100-500万', '500万-1000万', '1000万+', '未確認')),
  ADD COLUMN IF NOT EXISTS expected_start_period TEXT NOT NULL DEFAULT '未定'
    CHECK (expected_start_period IN ('1M以内', '3M以内', '6M以内', '未定')),
  ADD COLUMN IF NOT EXISTS qualification_score INTEGER NOT NULL DEFAULT 0
    CHECK (qualification_score BETWEEN 0 AND 6),
  ADD COLUMN IF NOT EXISTS promotion_blocked_reason TEXT;

-- Backfill: copy estimated_value into the new canonical fields.
UPDATE crm_leads
SET
  tcv = COALESCE(estimated_value, 0),
  one_time_amount = COALESCE(estimated_value, 0),
  stage_changed_at = updated_at
WHERE tcv = 0 OR tcv IS NULL;

CREATE INDEX IF NOT EXISTS idx_crm_leads_qualification_score
  ON crm_leads(qualification_score);
CREATE INDEX IF NOT EXISTS idx_crm_leads_next_action_date
  ON crm_leads(next_action_date);
