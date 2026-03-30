-- Create task_assignees junction table for multi-assignee support
CREATE TABLE IF NOT EXISTS task_assignees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  allocated_hours NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(task_id, user_id)
);

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_task_assignees_task_id ON task_assignees(task_id);
CREATE INDEX IF NOT EXISTS idx_task_assignees_user_id ON task_assignees(user_id);

-- RLS policies
ALTER TABLE task_assignees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users full access to task_assignees"
  ON task_assignees FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
