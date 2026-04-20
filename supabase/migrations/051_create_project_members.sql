-- 051_create_project_members.sql
-- KEEPER-1: addProjectMember() failed because the project_members table
-- referenced by the codebase had never been created in Supabase.
-- FK names match those used in project-members.ts selects:
--   project_members_pm_id_fkey, project_members_member_id_fkey.

CREATE TABLE IF NOT EXISTS project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_name TEXT NOT NULL,
  pm_id UUID NOT NULL
    CONSTRAINT project_members_pm_id_fkey REFERENCES users(id) ON DELETE CASCADE,
  member_id UUID NOT NULL
    CONSTRAINT project_members_member_id_fkey REFERENCES users(id) ON DELETE CASCADE,
  allocated_hours INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_members_project_name ON project_members(project_name);
CREATE INDEX IF NOT EXISTS idx_project_members_pm_id ON project_members(pm_id);
CREATE INDEX IF NOT EXISTS idx_project_members_member_id ON project_members(member_id);

-- Prevent duplicate (project, pm, member) rows.
CREATE UNIQUE INDEX IF NOT EXISTS uq_project_members_project_pm_member
  ON project_members(project_name, pm_id, member_id);

ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "project_members_all_authenticated" ON project_members;
CREATE POLICY "project_members_all_authenticated" ON project_members
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
