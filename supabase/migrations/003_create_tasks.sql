-- =============================================================================
-- 003: Tasks table
-- =============================================================================

CREATE TYPE task_status AS ENUM ('waiting', 'todo', 'in_progress', 'done', 'rejected');

CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  description TEXT,
  status task_status NOT NULL DEFAULT 'waiting',
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  requested_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  director_id UUID REFERENCES users(id) ON DELETE SET NULL,
  desired_deadline DATE,
  confirmed_deadline DATE,
  estimated_hours NUMERIC(5,1),
  actual_hours NUMERIC(5,1) NOT NULL DEFAULT 0,
  reference_url TEXT,
  is_draft BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX idx_tasks_status ON tasks (status);
CREATE INDEX idx_tasks_assigned_to ON tasks (assigned_to);
CREATE INDEX idx_tasks_requested_by ON tasks (requested_by);
CREATE INDEX idx_tasks_client_id ON tasks (client_id);
CREATE INDEX idx_tasks_confirmed_deadline ON tasks (confirmed_deadline);
CREATE INDEX idx_tasks_created_at ON tasks (created_at DESC);
