-- =============================================================================
-- 016: Time logs — work hours tracking per task (REQ-17)
-- =============================================================================

CREATE TABLE IF NOT EXISTS time_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id     UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  hours       NUMERIC(6,2) NOT NULL CHECK (hours > 0),
  description TEXT DEFAULT '',
  logged_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookups by task
CREATE INDEX IF NOT EXISTS idx_time_logs_task_id ON time_logs(task_id);

-- RLS
ALTER TABLE time_logs ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read time logs
CREATE POLICY "time_logs: select" ON time_logs
  FOR SELECT TO authenticated USING (true);

-- Users can insert their own time logs
CREATE POLICY "time_logs: insert own" ON time_logs
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Users can delete their own time logs
CREATE POLICY "time_logs: delete own" ON time_logs
  FOR DELETE TO authenticated USING (user_id = auth.uid());
