-- Add priority and weekly workload allocation to tasks
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 3 CHECK (priority BETWEEN 1 AND 5);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS planned_hours_per_week NUMERIC DEFAULT 0;

-- Create index for priority-based queries
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
