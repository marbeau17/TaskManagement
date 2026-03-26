-- =============================================================================
-- 017: Workflow settings per project (REQ-08)
-- Configurable statuses and transitions per project
-- =============================================================================

CREATE TABLE IF NOT EXISTS workflow_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
  statuses JSONB NOT NULL DEFAULT '["waiting","todo","in_progress","done"]',
  transitions JSONB DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workflow_settings_project ON workflow_settings(project_id);

ALTER TABLE workflow_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workflow_settings: select" ON workflow_settings
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "workflow_settings: insert" ON workflow_settings
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "workflow_settings: update" ON workflow_settings
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "workflow_settings: delete" ON workflow_settings
  FOR DELETE TO authenticated USING (true);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_workflow_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_workflow_settings_updated_at
  BEFORE UPDATE ON workflow_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_workflow_settings_updated_at();
