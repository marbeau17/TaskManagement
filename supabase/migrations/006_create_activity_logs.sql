-- =============================================================================
-- 006: Activity logs table
-- =============================================================================

CREATE TYPE activity_action AS ENUM (
  'created',
  'assigned',
  'progress_updated',
  'status_changed',
  'hours_updated',
  'comment_added',
  'deadline_changed',
  'rejected'
);

CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  action activity_action NOT NULL,
  detail JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_activity_logs_task_id ON activity_logs (task_id);
CREATE INDEX idx_activity_logs_created_at ON activity_logs (task_id, created_at DESC);
