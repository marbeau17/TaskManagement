-- AI 経営診断の永続化
-- 1 リードに対して複数回の診断履歴を持てる。最新は created_at DESC で取得。
CREATE TABLE IF NOT EXISTS crm_lead_diagnoses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES crm_leads(id) ON DELETE CASCADE,
  diagnosis JSONB NOT NULL,
  model TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_lead_diagnoses_lead ON crm_lead_diagnoses(lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_lead_diagnoses_created_at ON crm_lead_diagnoses(created_at DESC);

ALTER TABLE crm_lead_diagnoses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crm_lead_diagnoses_all" ON crm_lead_diagnoses
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
