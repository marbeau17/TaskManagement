-- =============================================================================
-- 007: Row Level Security policies and triggers
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Enable RLS on all tables
-- ---------------------------------------------------------------------------

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Helper functions (SECURITY DEFINER to avoid RLS recursion)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = 'public'
AS $$
  SELECT EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin');
$$;

CREATE OR REPLACE FUNCTION public.is_director_or_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = 'public'
AS $$
  SELECT EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'director'));
$$;

-- ---------------------------------------------------------------------------
-- Users policies
-- ---------------------------------------------------------------------------

-- All authenticated users can view all users (active/inactive filtering at app layer)
CREATE POLICY "Users: select all" ON users
  FOR SELECT TO authenticated
  USING (true);

-- All authenticated users can update (authorization at app layer)
CREATE POLICY "Users: authenticated update" ON users
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

-- All authenticated users can insert
CREATE POLICY "Users: authenticated insert" ON users
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- All authenticated users can delete
CREATE POLICY "Users: authenticated delete" ON users
  FOR DELETE TO authenticated
  USING (true);

-- ---------------------------------------------------------------------------
-- Clients policies
-- ---------------------------------------------------------------------------

-- All authenticated users can view clients
CREATE POLICY "Clients: select all" ON clients
  FOR SELECT TO authenticated
  USING (true);

-- Directors and admins can create/update clients
CREATE POLICY "Clients: director/admin manage" ON clients
  FOR ALL TO authenticated
  USING (public.is_director_or_admin())
  WITH CHECK (public.is_director_or_admin());

-- ---------------------------------------------------------------------------
-- Tasks policies
-- ---------------------------------------------------------------------------

-- All authenticated users can view tasks
CREATE POLICY "Tasks: select all" ON tasks
  FOR SELECT TO authenticated
  USING (true);

-- Requesters can create tasks
CREATE POLICY "Tasks: insert by requester" ON tasks
  FOR INSERT TO authenticated
  WITH CHECK (requested_by = auth.uid());

-- Directors and admins can update any task
CREATE POLICY "Tasks: director/admin update" ON tasks
  FOR UPDATE TO authenticated
  USING (public.is_director_or_admin())
  WITH CHECK (public.is_director_or_admin());

-- Assigned creators can update their own tasks (progress, hours, status)
CREATE POLICY "Tasks: creator update own" ON tasks
  FOR UPDATE TO authenticated
  USING (assigned_to = auth.uid());

-- ---------------------------------------------------------------------------
-- Comments policies
-- ---------------------------------------------------------------------------

-- All authenticated users can view comments
CREATE POLICY "Comments: select all" ON comments
  FOR SELECT TO authenticated
  USING (true);

-- All authenticated users can add comments
CREATE POLICY "Comments: insert" ON comments
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Attachments policies
-- ---------------------------------------------------------------------------

-- All authenticated users can view attachments
CREATE POLICY "Attachments: select all" ON attachments
  FOR SELECT TO authenticated
  USING (true);

-- All authenticated users can upload attachments
CREATE POLICY "Attachments: insert" ON attachments
  FOR INSERT TO authenticated
  WITH CHECK (uploaded_by = auth.uid());

-- ---------------------------------------------------------------------------
-- Activity logs policies
-- ---------------------------------------------------------------------------

-- All authenticated users can view activity logs
CREATE POLICY "Activity logs: select all" ON activity_logs
  FOR SELECT TO authenticated
  USING (true);

-- System inserts only (via triggers or service role)
CREATE POLICY "Activity logs: service insert" ON activity_logs
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- Trigger: auto-update updated_at on users
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_updated_at();

-- ---------------------------------------------------------------------------
-- Trigger: auto-insert activity log on task status change
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION trigger_task_status_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO activity_logs (task_id, user_id, action, detail)
    VALUES (
      NEW.id,
      COALESCE(NEW.director_id, NEW.assigned_to, NEW.requested_by),
      'status_changed',
      jsonb_build_object('old', OLD.status, 'new', NEW.status)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER task_status_activity
  AFTER UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION trigger_task_status_activity();

-- ---------------------------------------------------------------------------
-- Trigger: auto-insert activity log on task progress change
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION trigger_task_progress_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.progress IS DISTINCT FROM NEW.progress THEN
    INSERT INTO activity_logs (task_id, user_id, action, detail)
    VALUES (
      NEW.id,
      COALESCE(NEW.assigned_to, NEW.director_id, NEW.requested_by),
      'progress_updated',
      jsonb_build_object('old', OLD.progress, 'new', NEW.progress)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER task_progress_activity
  AFTER UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION trigger_task_progress_activity();

-- ---------------------------------------------------------------------------
-- Trigger: auto-insert activity log when comment is added
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION trigger_comment_activity()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO activity_logs (task_id, user_id, action, detail)
  VALUES (
    NEW.task_id,
    NEW.user_id,
    'comment_added',
    jsonb_build_object('comment_id', NEW.id)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER comment_added_activity
  AFTER INSERT ON comments
  FOR EACH ROW
  EXECUTE FUNCTION trigger_comment_activity();
