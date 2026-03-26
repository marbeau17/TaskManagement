-- =============================================================================
-- 013: Notifications table
-- =============================================================================

CREATE TABLE IF NOT EXISTS notifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        text NOT NULL DEFAULT 'info',
  title       text NOT NULL,
  message     text NOT NULL DEFAULT '',
  link        text DEFAULT NULL,
  is_read     boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Index for efficient unread-count queries and listing
CREATE INDEX idx_notifications_user_read ON notifications (user_id, is_read);

-- ---------------------------------------------------------------------------
-- RLS policies
-- ---------------------------------------------------------------------------

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can read their own notifications
CREATE POLICY "Notifications: select own" ON notifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Users can update (mark as read) their own notifications
CREATE POLICY "Notifications: update own" ON notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Service / triggers can insert notifications for any user
CREATE POLICY "Notifications: service insert" ON notifications
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Users can delete their own notifications
CREATE POLICY "Notifications: delete own" ON notifications
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());
