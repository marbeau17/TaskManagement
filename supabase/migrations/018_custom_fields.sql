-- =============================================================================
-- 018: Custom fields for issues and tasks (REQ-06)
-- =============================================================================

-- Definitions: what custom fields exist per project
CREATE TABLE IF NOT EXISTS custom_field_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  field_type TEXT NOT NULL CHECK (field_type IN ('text', 'number', 'select', 'date', 'checkbox')),
  options JSONB DEFAULT '[]'::jsonb,
  required BOOLEAN DEFAULT false,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cfd_project ON custom_field_definitions(project_id);

ALTER TABLE custom_field_definitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "custom_field_definitions: select" ON custom_field_definitions
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "custom_field_definitions: insert" ON custom_field_definitions
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "custom_field_definitions: update" ON custom_field_definitions
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "custom_field_definitions: delete" ON custom_field_definitions
  FOR DELETE TO authenticated USING (true);

-- Values: actual field values attached to entities (issues or tasks)
CREATE TABLE IF NOT EXISTS custom_field_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('issue', 'task')),
  entity_id UUID NOT NULL,
  field_id UUID NOT NULL REFERENCES custom_field_definitions(id) ON DELETE CASCADE,
  value JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(entity_type, entity_id, field_id)
);

CREATE INDEX IF NOT EXISTS idx_cfv_entity ON custom_field_values(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_cfv_field ON custom_field_values(field_id);

ALTER TABLE custom_field_values ENABLE ROW LEVEL SECURITY;
CREATE POLICY "custom_field_values: select" ON custom_field_values
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "custom_field_values: insert" ON custom_field_values
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "custom_field_values: update" ON custom_field_values
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "custom_field_values: delete" ON custom_field_values
  FOR DELETE TO authenticated USING (true);
