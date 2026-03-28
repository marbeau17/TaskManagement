-- =============================================================================
-- 020: Tighten RLS policies
-- Restrict permissions, users, projects, issues DELETE/UPDATE operations
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. permissions table: admin-only write, authenticated read
-- ---------------------------------------------------------------------------

-- Drop existing permissive policies
DROP POLICY IF EXISTS "permissions: select" ON permissions;
DROP POLICY IF EXISTS "permissions: manage" ON permissions;

-- SELECT: all authenticated users can read
CREATE POLICY "permissions: select" ON permissions
  FOR SELECT TO authenticated
  USING (true);

-- INSERT: admin only
CREATE POLICY "permissions: admin insert" ON permissions
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- UPDATE: admin only
CREATE POLICY "permissions: admin update" ON permissions
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- DELETE: admin only
CREATE POLICY "permissions: admin delete" ON permissions
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- ---------------------------------------------------------------------------
-- 2. users table: restrict UPDATE to own profile or admin, DELETE to admin
-- ---------------------------------------------------------------------------

-- Drop existing permissive policies for UPDATE and DELETE
DROP POLICY IF EXISTS "Users: authenticated update" ON users;
DROP POLICY IF EXISTS "Users: authenticated delete" ON users;

-- UPDATE: own profile OR admin
CREATE POLICY "Users: self or admin update" ON users
  FOR UPDATE TO authenticated
  USING (
    id = auth.uid()
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    id = auth.uid()
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- DELETE: admin only
CREATE POLICY "Users: admin delete" ON users
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- ---------------------------------------------------------------------------
-- 3. projects table: restrict DELETE to creator (pm_id) or admin
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "projects: manage" ON projects;

-- INSERT: all authenticated users can create projects
CREATE POLICY "projects: insert" ON projects
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- UPDATE: all authenticated users can update projects
CREATE POLICY "projects: update" ON projects
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

-- DELETE: only project manager (pm_id) or admin
CREATE POLICY "projects: creator or admin delete" ON projects
  FOR DELETE TO authenticated
  USING (
    pm_id = auth.uid()
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- ---------------------------------------------------------------------------
-- 4. issues table: restrict DELETE to reporter (reported_by) or admin
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "issues: manage" ON issues;

-- INSERT: all authenticated users can create issues
CREATE POLICY "issues: insert" ON issues
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- UPDATE: all authenticated users can update issues
CREATE POLICY "issues: update" ON issues
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

-- DELETE: only reporter or admin
CREATE POLICY "issues: reporter or admin delete" ON issues
  FOR DELETE TO authenticated
  USING (
    reported_by = auth.uid()
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );
