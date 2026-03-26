-- =============================================================================
-- 015: Task watchers / followers
-- =============================================================================

CREATE TABLE IF NOT EXISTS task_watchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(task_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_task_watchers_task ON task_watchers(task_id);
CREATE INDEX IF NOT EXISTS idx_task_watchers_user ON task_watchers(user_id);

ALTER TABLE task_watchers ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can view watchers
CREATE POLICY "task_watchers: select" ON task_watchers
  FOR SELECT TO authenticated USING (true);

-- Users can add themselves as watchers
CREATE POLICY "task_watchers: insert" ON task_watchers
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Users can remove themselves as watchers
CREATE POLICY "task_watchers: delete" ON task_watchers
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
