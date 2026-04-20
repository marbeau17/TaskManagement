-- Create backlog_items table for pre-task ideas / future work
CREATE TABLE IF NOT EXISTS backlog_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  priority INTEGER NOT NULL DEFAULT 3,
  estimated_hours NUMERIC,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'ready', 'promoted', 'archived')),
  assignee_id UUID REFERENCES users(id) ON DELETE SET NULL,
  promoted_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_backlog_items_project_id ON backlog_items(project_id);
CREATE INDEX IF NOT EXISTS idx_backlog_items_status ON backlog_items(status);
CREATE INDEX IF NOT EXISTS idx_backlog_items_assignee_id ON backlog_items(assignee_id);

ALTER TABLE backlog_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users full access to backlog_items"
  ON backlog_items FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION update_backlog_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_backlog_items_updated_at
  BEFORE UPDATE ON backlog_items
  FOR EACH ROW
  EXECUTE FUNCTION update_backlog_items_updated_at();
