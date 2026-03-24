-- =============================================================================
-- WorkFlow TaskManagement - Complete Database Setup
-- =============================================================================
-- This file combines all migrations (001-008) + seed data into a single script
-- that can be pasted into the Supabase SQL Editor.
--
-- UUID conventions:
--   Users:       00000000-0000-0000-0000-000000000001 .. 011
--   Clients:     00000000-0000-0000-0000-000000000101 .. 103
--   Tasks:       00000000-0000-0000-0000-000000000201 .. 214
--   Comments:    00000000-0000-0000-0000-000000000301 .. 302
--   Activities:  00000000-0000-0000-0000-000000000401 .. 404
--   Attachments: 00000000-0000-0000-0000-000000000501 .. 502
-- =============================================================================

BEGIN;

-- =============================================================================
-- 001: Users table
-- =============================================================================

CREATE TYPE user_role AS ENUM ('admin', 'director', 'requester', 'creator');
CREATE TYPE avatar_color AS ENUM ('av-a', 'av-b', 'av-c', 'av-d', 'av-e');

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  name_short TEXT,
  role user_role NOT NULL DEFAULT 'creator',
  avatar_color avatar_color DEFAULT 'av-a',
  weekly_capacity_hours NUMERIC(4,1) DEFAULT 16.0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_users_active ON users (is_active) WHERE is_active = true;
CREATE INDEX idx_users_role ON users (role);

-- =============================================================================
-- 002: Clients table
-- =============================================================================

CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_clients_name ON clients (name);

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

CREATE INDEX idx_tasks_status ON tasks (status);
CREATE INDEX idx_tasks_assigned_to ON tasks (assigned_to);
CREATE INDEX idx_tasks_requested_by ON tasks (requested_by);
CREATE INDEX idx_tasks_client_id ON tasks (client_id);
CREATE INDEX idx_tasks_confirmed_deadline ON tasks (confirmed_deadline);
CREATE INDEX idx_tasks_created_at ON tasks (created_at DESC);

-- =============================================================================
-- 004: Comments table
-- =============================================================================

CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_comments_task_id ON comments (task_id);
CREATE INDEX idx_comments_created_at ON comments (task_id, created_at ASC);

-- =============================================================================
-- 005: Attachments table
-- =============================================================================

CREATE TABLE attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL DEFAULT 0,
  mime_type TEXT NOT NULL DEFAULT 'application/octet-stream',
  storage_path TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_attachments_task_id ON attachments (task_id);

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
-- Users policies
-- ---------------------------------------------------------------------------

CREATE POLICY "Users: select active" ON users
  FOR SELECT TO authenticated
  USING (is_active = true);

CREATE POLICY "Users: admin full access" ON users
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

CREATE POLICY "Users: self update" ON users
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ---------------------------------------------------------------------------
-- Clients policies
-- ---------------------------------------------------------------------------

CREATE POLICY "Clients: select all" ON clients
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Clients: director/admin manage" ON clients
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'director')
    )
  );

-- ---------------------------------------------------------------------------
-- Tasks policies
-- ---------------------------------------------------------------------------

CREATE POLICY "Tasks: select all" ON tasks
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Tasks: insert by requester" ON tasks
  FOR INSERT TO authenticated
  WITH CHECK (requested_by = auth.uid());

CREATE POLICY "Tasks: director/admin update" ON tasks
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'director')
    )
  );

CREATE POLICY "Tasks: creator update own" ON tasks
  FOR UPDATE TO authenticated
  USING (assigned_to = auth.uid());

-- ---------------------------------------------------------------------------
-- Comments policies
-- ---------------------------------------------------------------------------

CREATE POLICY "Comments: select all" ON comments
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Comments: insert" ON comments
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Attachments policies
-- ---------------------------------------------------------------------------

CREATE POLICY "Attachments: select all" ON attachments
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Attachments: insert" ON attachments
  FOR INSERT TO authenticated
  WITH CHECK (uploaded_by = auth.uid());

-- ---------------------------------------------------------------------------
-- Activity logs policies
-- ---------------------------------------------------------------------------

CREATE POLICY "Activity logs: select all" ON activity_logs
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Activity logs: service insert" ON activity_logs
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- Trigger: auto-update updated_at on users and tasks
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

-- =============================================================================
-- 008: Add must_change_password column
-- =============================================================================

ALTER TABLE users ADD COLUMN must_change_password BOOLEAN DEFAULT true;

-- =============================================================================
-- =============================================================================
-- SEED DATA
-- =============================================================================
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Users (11 members from meetsc.co.jp)
-- ---------------------------------------------------------------------------
-- u1  = 伊藤 祐太    (admin,    CEO)
-- u2  = 安田 修       (director, COO)
-- u3  = 秋元 由美子   (creator)
-- u4  = 渡邊 梨紗     (creator)
-- u5  = 瀧宮 誠       (admin,    Manager)
-- u6  = 太田 晴瑠     (creator)
-- u7  = Luca Trabuio  (creator)
-- u8  = 角田 春華     (creator)
-- u9  = Rafael Agcaoili (creator)
-- u10 = 竹内 美鈴     (creator)
-- u11 = Yudi Dharma Putra (creator)
-- ---------------------------------------------------------------------------

INSERT INTO users (id, email, name, name_short, role, avatar_color, weekly_capacity_hours, is_active, must_change_password, created_at, updated_at)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'y.ito@meetsc.co.jp',      '伊藤 祐太',          '伊', 'admin',    'av-a', 40.0, true, false, '2020-01-01T00:00:00+09:00', '2020-01-01T00:00:00+09:00'),
  ('00000000-0000-0000-0000-000000000002', 'o.yasuda@meetsc.co.jp',   '安田 修',             '安', 'director', 'av-b', 40.0, true, false, '2020-01-01T00:00:00+09:00', '2020-01-01T00:00:00+09:00'),
  ('00000000-0000-0000-0000-000000000003', 'y.akimoto@meetsc.co.jp',  '秋元 由美子',         '秋', 'creator',  'av-c', 16.0, true, false, '2022-04-01T00:00:00+09:00', '2022-04-01T00:00:00+09:00'),
  ('00000000-0000-0000-0000-000000000004', 'r.watanabe@meetsc.co.jp', '渡邊 梨紗',           '渡', 'creator',  'av-d', 16.0, true, false, '2023-01-01T00:00:00+09:00', '2023-01-01T00:00:00+09:00'),
  ('00000000-0000-0000-0000-000000000005', 'm.takimiya@meetsc.co.jp', '瀧宮 誠',             '瀧', 'admin',    'av-e', 40.0, true, false, '2021-04-01T00:00:00+09:00', '2021-04-01T00:00:00+09:00'),
  ('00000000-0000-0000-0000-000000000006', 'h.ohta@meetsc.co.jp',     '太田 晴瑠',           '太', 'creator',  'av-a', 16.0, true, false, '2023-04-01T00:00:00+09:00', '2023-04-01T00:00:00+09:00'),
  ('00000000-0000-0000-0000-000000000007', 'l.trabuio@meetsc.co.jp',  'Luca Trabuio',        'L',  'creator',  'av-b', 16.0, true, false, '2023-07-01T00:00:00+09:00', '2023-07-01T00:00:00+09:00'),
  ('00000000-0000-0000-0000-000000000008', 'h.kadota@meetsc.co.jp',   '角田 春華',           '角', 'creator',  'av-c', 16.0, true, false, '2024-04-01T00:00:00+09:00', '2024-04-01T00:00:00+09:00'),
  ('00000000-0000-0000-0000-000000000009', 'r.agcaoili@meetsc.co.jp', 'Rafael Agcaoili',     'R',  'creator',  'av-d', 16.0, true, false, '2024-10-01T00:00:00+09:00', '2024-10-01T00:00:00+09:00'),
  ('00000000-0000-0000-0000-000000000010', 'm.takeuchi@meetsc.co.jp', '竹内 美鈴',           '竹', 'creator',  'av-e', 16.0, true, false, '2025-01-01T00:00:00+09:00', '2025-01-01T00:00:00+09:00'),
  ('00000000-0000-0000-0000-000000000011', 'y.putra@meetsc.co.jp',    'Yudi Dharma Putra',   'Y',  'creator',  'av-a', 16.0, true, false, '2025-04-01T00:00:00+09:00', '2025-04-01T00:00:00+09:00');

-- ---------------------------------------------------------------------------
-- Clients (3)
-- ---------------------------------------------------------------------------

INSERT INTO clients (id, name, created_at)
VALUES
  ('00000000-0000-0000-0000-000000000101', '株式会社サンプル',     '2025-01-01T00:00:00+09:00'),
  ('00000000-0000-0000-0000-000000000102', 'テスト工業株式会社',   '2025-01-01T00:00:00+09:00'),
  ('00000000-0000-0000-0000-000000000103', 'グローバル商事',       '2025-01-01T00:00:00+09:00');

-- ---------------------------------------------------------------------------
-- Tasks (14 tasks)
-- ---------------------------------------------------------------------------
-- Requester for all tasks: u2 = 安田 修 (director/COO)
-- Director for assigned tasks: u2 = 安田 修
-- c1 = 株式会社サンプル, c2 = テスト工業株式会社, c3 = グローバル商事
-- ---------------------------------------------------------------------------

INSERT INTO tasks (id, client_id, title, description, status, progress, requested_by, assigned_to, director_id, desired_deadline, confirmed_deadline, estimated_hours, actual_hours, reference_url, is_draft, created_at, updated_at)
VALUES
  -- 1. TOPページ コーディング — in_progress, assigned to Luca (u7)
  (
    '00000000-0000-0000-0000-000000000201',
    '00000000-0000-0000-0000-000000000101',
    'TOPページ コーディング',
    'TOPページのレスポンシブ対応コーディング。デザインカンプに基づいて実装。',
    'in_progress', 75,
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000007',
    '00000000-0000-0000-0000-000000000002',
    NULL, '2025-04-12', 12.0, 9.5, NULL, false,
    '2025-04-09T09:00:00+09:00', '2025-04-11T16:00:00+09:00'
  ),
  -- 2. 採用バナー制作 — waiting, unassigned
  (
    '00000000-0000-0000-0000-000000000202',
    '00000000-0000-0000-0000-000000000102',
    '採用バナー制作',
    '採用サイト用のバナー画像制作。サイズ: 1200x628px。',
    'waiting', 0,
    '00000000-0000-0000-0000-000000000002',
    NULL, NULL,
    '2025-04-18', NULL, NULL, 0, NULL, false,
    '2025-04-10T10:00:00+09:00', '2025-04-10T10:00:00+09:00'
  ),
  -- 3. LP 原稿執筆 — done, assigned to 渡邊 (u4)
  (
    '00000000-0000-0000-0000-000000000203',
    '00000000-0000-0000-0000-000000000103',
    'LP 原稿執筆',
    'ランディングページ用のコピーライティング。',
    'done', 100,
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000004',
    '00000000-0000-0000-0000-000000000002',
    NULL, '2025-04-10', 8.0, 8.0, NULL, false,
    '2025-04-05T09:00:00+09:00', '2025-04-10T17:00:00+09:00'
  ),
  -- 4. 会社案内 デザイン — in_progress, assigned to 秋元 (u3)
  (
    '00000000-0000-0000-0000-000000000204',
    '00000000-0000-0000-0000-000000000101',
    '会社案内 デザイン',
    '会社案内パンフレットのデザイン。A4 三つ折り。',
    'in_progress', 50,
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000002',
    NULL, '2025-04-13', 16.0, 8.0, NULL, false,
    '2025-04-07T09:00:00+09:00', '2025-04-11T12:00:00+09:00'
  ),
  -- 5. SNSバナー制作 5点 — in_progress, assigned to 角田 (u8)
  (
    '00000000-0000-0000-0000-000000000205',
    '00000000-0000-0000-0000-000000000103',
    'SNSバナー制作 5点',
    'Instagram / X 用のバナー画像5点セット。',
    'in_progress', 25,
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000008',
    '00000000-0000-0000-0000-000000000002',
    NULL, '2025-04-15', 6.0, 2.0, NULL, false,
    '2025-04-08T09:00:00+09:00', '2025-04-11T10:00:00+09:00'
  ),
  -- 6. ニュースレター原稿 — waiting, unassigned
  (
    '00000000-0000-0000-0000-000000000206',
    '00000000-0000-0000-0000-000000000102',
    'ニュースレター原稿',
    '月次ニュースレターの原稿作成。',
    'waiting', 0,
    '00000000-0000-0000-0000-000000000002',
    NULL, NULL,
    '2025-04-20', NULL, NULL, 0, NULL, false,
    '2025-04-10T14:00:00+09:00', '2025-04-10T14:00:00+09:00'
  ),
  -- 7. LP ファーストビュー — in_progress, assigned to Rafael (u9)
  (
    '00000000-0000-0000-0000-000000000207',
    '00000000-0000-0000-0000-000000000103',
    'LP ファーストビュー',
    'ランディングページのファーストビューデザイン。',
    'in_progress', 40,
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000009',
    '00000000-0000-0000-0000-000000000002',
    NULL, '2025-04-17', 10.0, 4.0, NULL, false,
    '2025-04-08T11:00:00+09:00', '2025-04-11T09:00:00+09:00'
  ),
  -- 8. ECサイト 商品ページ更新 — todo, assigned to 太田 (u6)
  (
    '00000000-0000-0000-0000-000000000208',
    '00000000-0000-0000-0000-000000000101',
    'ECサイト 商品ページ更新',
    '新商品追加に伴う商品ページの更新作業。',
    'todo', 0,
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000006',
    '00000000-0000-0000-0000-000000000002',
    NULL, '2025-04-20', 8.0, 0, NULL, false,
    '2025-04-10T09:00:00+09:00', '2025-04-10T09:00:00+09:00'
  ),
  -- 9. メルマガテンプレートデザイン — todo, assigned to 竹内 (u10)
  (
    '00000000-0000-0000-0000-000000000209',
    '00000000-0000-0000-0000-000000000102',
    'メルマガテンプレートデザイン',
    'HTMLメルマガのテンプレートデザイン作成。',
    'todo', 0,
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000010',
    '00000000-0000-0000-0000-000000000002',
    NULL, '2025-04-22', 6.0, 0, NULL, false,
    '2025-04-11T09:00:00+09:00', '2025-04-11T09:00:00+09:00'
  ),
  -- 10. ロゴリニューアル提案 — done, assigned to 渡邊 (u4)
  (
    '00000000-0000-0000-0000-000000000210',
    '00000000-0000-0000-0000-000000000103',
    'ロゴリニューアル提案',
    'ロゴマークのリニューアル案を3パターン提案。',
    'done', 100,
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000004',
    '00000000-0000-0000-0000-000000000002',
    NULL, '2025-04-08', 10.0, 12.0, NULL, false,
    '2025-04-01T09:00:00+09:00', '2025-04-08T18:00:00+09:00'
  ),
  -- 11. 製品カタログ DTP — in_progress, assigned to Yudi (u11)
  (
    '00000000-0000-0000-0000-000000000211',
    '00000000-0000-0000-0000-000000000101',
    '製品カタログ DTP',
    '新製品カタログのDTP作業。A4 16ページ。',
    'in_progress', 60,
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000011',
    '00000000-0000-0000-0000-000000000002',
    NULL, '2025-04-18', 20.0, 12.0, NULL, false,
    '2025-04-03T09:00:00+09:00', '2025-04-11T14:00:00+09:00'
  ),
  -- 12. 名刺デザイン — done, assigned to Rafael (u9)
  (
    '00000000-0000-0000-0000-000000000212',
    '00000000-0000-0000-0000-000000000102',
    '名刺デザイン',
    '役員用名刺の新デザイン。両面カラー。',
    'done', 100,
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000009',
    '00000000-0000-0000-0000-000000000002',
    NULL, '2025-04-05', 4.0, 3.5, NULL, false,
    '2025-03-28T09:00:00+09:00', '2025-04-05T15:00:00+09:00'
  ),
  -- 13. ウェブ広告バナーセット — todo, assigned to Luca (u7)
  (
    '00000000-0000-0000-0000-000000000213',
    '00000000-0000-0000-0000-000000000103',
    'ウェブ広告バナーセット',
    'Google / Yahoo ディスプレイ広告用バナー6サイズ。',
    'todo', 0,
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000007',
    '00000000-0000-0000-0000-000000000002',
    NULL, '2025-04-25', 8.0, 0, NULL, false,
    '2025-04-11T10:00:00+09:00', '2025-04-11T10:00:00+09:00'
  ),
  -- 14. プレスリリース用画像 — todo, assigned to 角田 (u8)
  (
    '00000000-0000-0000-0000-000000000214',
    '00000000-0000-0000-0000-000000000101',
    'プレスリリース用画像',
    'プレスリリース配信用のOGP画像とサムネイル画像。',
    'todo', 0,
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000008',
    '00000000-0000-0000-0000-000000000002',
    NULL, '2025-04-24', 4.0, 0, NULL, false,
    '2025-04-11T11:00:00+09:00', '2025-04-11T11:00:00+09:00'
  );

-- ---------------------------------------------------------------------------
-- Comments (2 for task 1)
-- ---------------------------------------------------------------------------
-- NOTE: The comment_added_activity trigger will fire automatically,
--       so we disable it temporarily to avoid duplicate activity logs.
-- ---------------------------------------------------------------------------

ALTER TABLE comments DISABLE TRIGGER comment_added_activity;

INSERT INTO comments (id, task_id, user_id, body, created_at)
VALUES
  (
    '00000000-0000-0000-0000-000000000301',
    '00000000-0000-0000-0000-000000000201',
    '00000000-0000-0000-0000-000000000007',
    'レスポンシブ対応のSPブレークポイントは 375px と 390px どちらを基準にしますか？',
    '2025-04-11T14:32:00+09:00'
  ),
  (
    '00000000-0000-0000-0000-000000000302',
    '00000000-0000-0000-0000-000000000201',
    '00000000-0000-0000-0000-000000000002',
    '375px で対応してください。クライアント指定です。',
    '2025-04-11T15:10:00+09:00'
  );

ALTER TABLE comments ENABLE TRIGGER comment_added_activity;

-- ---------------------------------------------------------------------------
-- Activity logs (4 for task 1)
-- ---------------------------------------------------------------------------

INSERT INTO activity_logs (id, task_id, user_id, action, detail, created_at)
VALUES
  (
    '00000000-0000-0000-0000-000000000401',
    '00000000-0000-0000-0000-000000000201',
    '00000000-0000-0000-0000-000000000002',
    'created', NULL,
    '2025-04-09T09:00:00+09:00'
  ),
  (
    '00000000-0000-0000-0000-000000000402',
    '00000000-0000-0000-0000-000000000201',
    '00000000-0000-0000-0000-000000000002',
    'assigned', '{"assigned_to": "Luca Trabuio"}'::jsonb,
    '2025-04-09T09:05:00+09:00'
  ),
  (
    '00000000-0000-0000-0000-000000000403',
    '00000000-0000-0000-0000-000000000201',
    '00000000-0000-0000-0000-000000000007',
    'progress_updated', '{"old": 50, "new": 75}'::jsonb,
    '2025-04-11T15:30:00+09:00'
  ),
  (
    '00000000-0000-0000-0000-000000000404',
    '00000000-0000-0000-0000-000000000201',
    '00000000-0000-0000-0000-000000000007',
    'hours_updated', '{"old": 6.0, "new": 9.5}'::jsonb,
    '2025-04-11T16:00:00+09:00'
  );

-- ---------------------------------------------------------------------------
-- Attachments (2 for task 1)
-- ---------------------------------------------------------------------------

INSERT INTO attachments (id, task_id, uploaded_by, file_name, file_size, mime_type, storage_path, created_at)
VALUES
  (
    '00000000-0000-0000-0000-000000000501',
    '00000000-0000-0000-0000-000000000201',
    '00000000-0000-0000-0000-000000000002',
    'wireframe_v2.fig', 2516582, 'application/fig', '/attachments/wireframe_v2.fig',
    '2025-04-09T09:10:00+09:00'
  ),
  (
    '00000000-0000-0000-0000-000000000502',
    '00000000-0000-0000-0000-000000000201',
    '00000000-0000-0000-0000-000000000002',
    'brandguide_2024.pdf', 1153434, 'application/pdf', '/attachments/brandguide_2024.pdf',
    '2025-04-09T09:15:00+09:00'
  );

COMMIT;

-- =============================================================================
-- Verification queries (run these after setup to confirm data)
-- =============================================================================
-- SELECT 'users' AS tbl, count(*) FROM users;
-- SELECT 'clients' AS tbl, count(*) FROM clients;
-- SELECT 'tasks' AS tbl, count(*) FROM tasks;
-- SELECT 'comments' AS tbl, count(*) FROM comments;
-- SELECT 'activity_logs' AS tbl, count(*) FROM activity_logs;
-- SELECT 'attachments' AS tbl, count(*) FROM attachments;
-- Expected: users=11, clients=3, tasks=14, comments=2, activity_logs=4, attachments=2
