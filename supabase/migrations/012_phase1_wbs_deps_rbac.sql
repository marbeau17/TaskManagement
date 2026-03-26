-- =============================================================================
-- 012: Phase 1 - WBS hierarchy, issue dependencies, RBAC permissions
-- =============================================================================

-- Task hierarchy (WBS)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS parent_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS wbs_code TEXT DEFAULT '';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS start_date DATE;
CREATE INDEX IF NOT EXISTS idx_tasks_parent ON tasks(parent_task_id);

-- Issue dependencies
CREATE TABLE IF NOT EXISTS issue_relations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_issue_id UUID NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
  target_issue_id UUID NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
  relation_type TEXT NOT NULL DEFAULT 'relates_to',
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(source_issue_id, target_issue_id, relation_type)
);
ALTER TABLE issue_relations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "issue_relations: all" ON issue_relations FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Task dependencies
CREATE TABLE IF NOT EXISTS task_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  target_task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  relation_type TEXT NOT NULL DEFAULT 'blocks',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(source_task_id, target_task_id, relation_type)
);
ALTER TABLE task_dependencies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "task_dependencies: all" ON task_dependencies FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Permissions table for RBAC
CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role TEXT NOT NULL,
  resource TEXT NOT NULL,
  action TEXT NOT NULL,
  allowed BOOLEAN DEFAULT true,
  UNIQUE(role, resource, action)
);
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "permissions: select" ON permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "permissions: manage" ON permissions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Seed default permissions
INSERT INTO permissions (role, resource, action) VALUES
  -- Admin: everything
  ('admin', '*', '*'),
  -- Director: manage tasks, issues, projects, members
  ('director', 'tasks', 'create'), ('director', 'tasks', 'read'), ('director', 'tasks', 'update'), ('director', 'tasks', 'delete'),
  ('director', 'issues', 'create'), ('director', 'issues', 'read'), ('director', 'issues', 'update'),
  ('director', 'projects', 'create'), ('director', 'projects', 'read'), ('director', 'projects', 'update'),
  ('director', 'members', 'read'), ('director', 'members', 'update'),
  -- Creator: own tasks, create issues
  ('creator', 'tasks', 'read'), ('creator', 'tasks', 'update'),
  ('creator', 'issues', 'create'), ('creator', 'issues', 'read'), ('creator', 'issues', 'update'),
  ('creator', 'projects', 'read'),
  ('creator', 'members', 'read'),
  -- Requester: create tasks, read
  ('requester', 'tasks', 'create'), ('requester', 'tasks', 'read'),
  ('requester', 'issues', 'read'),
  ('requester', 'projects', 'read'),
  ('requester', 'members', 'read')
ON CONFLICT DO NOTHING;
