-- Pipeline opportunities table
CREATE TABLE IF NOT EXISTS pipeline_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seq_id INTEGER NOT NULL,
  is_new BOOLEAN DEFAULT false,
  client_name TEXT NOT NULL DEFAULT '',
  referral_source TEXT DEFAULT '',
  opportunity_name TEXT DEFAULT '',
  sub_opportunity TEXT DEFAULT '',
  status TEXT DEFAULT 'Namelikly' CHECK (status IN ('Firm', 'Namelikly', 'Win', 'Lost', '')),
  probability INTEGER DEFAULT 0 CHECK (probability BETWEEN 0 AND 100),
  cm_percent INTEGER DEFAULT 0,
  pm_user_id UUID REFERENCES users(id),
  consultant1_user_id UUID REFERENCES users(id),
  consultant2_user_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Monthly revenue data for each opportunity
CREATE TABLE IF NOT EXISTS pipeline_monthly_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID NOT NULL REFERENCES pipeline_opportunities(id) ON DELETE CASCADE,
  month TEXT NOT NULL, -- format: '2025-10', '2025-11', etc.
  revenue NUMERIC DEFAULT 0, -- in thousands of yen
  cm NUMERIC DEFAULT 0,
  cm_percent NUMERIC DEFAULT 0,
  revenue_plan NUMERIC DEFAULT 0, -- revenue * probability
  UNIQUE(opportunity_id, month)
);

CREATE INDEX IF NOT EXISTS idx_pipeline_opp_client ON pipeline_opportunities(client_name);
CREATE INDEX IF NOT EXISTS idx_pipeline_monthly_opp ON pipeline_monthly_data(opportunity_id);

-- RLS
ALTER TABLE pipeline_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_monthly_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated full access to pipeline_opportunities"
  ON pipeline_opportunities FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated full access to pipeline_monthly_data"
  ON pipeline_monthly_data FOR ALL TO authenticated USING (true) WITH CHECK (true);
