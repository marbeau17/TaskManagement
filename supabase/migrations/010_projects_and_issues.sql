-- =============================================================================
-- 010: Projects table + Issues table + seed data
-- Run this in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/ewlxqiowzdebksykxvuv/sql/new
-- =============================================================================

-- Projects
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active',
  pm_id UUID REFERENCES users(id) ON DELETE SET NULL,
  key_prefix TEXT NOT NULL DEFAULT 'PRJ',
  next_issue_seq INTEGER DEFAULT 1,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "projects: select" ON projects FOR SELECT TO authenticated USING (true);
CREATE POLICY "projects: manage" ON projects FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Add project_id to tasks
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL;

-- Issues
CREATE TABLE IF NOT EXISTS issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  issue_key TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'bug',
  severity TEXT NOT NULL DEFAULT 'medium',
  priority INTEGER DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
  status TEXT NOT NULL DEFAULT 'open',
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  reproduction_steps TEXT DEFAULT '',
  expected_result TEXT DEFAULT '',
  actual_result TEXT DEFAULT '',
  environment JSONB DEFAULT '{}',
  source TEXT DEFAULT 'internal',
  reported_by UUID NOT NULL REFERENCES users(id),
  assigned_to UUID REFERENCES users(id),
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  resolution_notes TEXT DEFAULT '',
  git_branch TEXT DEFAULT '',
  git_pr_url TEXT DEFAULT '',
  labels TEXT[] DEFAULT '{}',
  sla_response_deadline TIMESTAMPTZ,
  sla_resolution_deadline TIMESTAMPTZ,
  first_responded_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  reopen_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_issues_project ON issues(project_id);
CREATE INDEX IF NOT EXISTS idx_issues_status ON issues(status);
ALTER TABLE issues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "issues: select" ON issues FOR SELECT TO authenticated USING (true);
CREATE POLICY "issues: manage" ON issues FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Issue comments
CREATE TABLE IF NOT EXISTS issue_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE issue_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "issue_comments: all" ON issue_comments FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Issue activity logs
CREATE TABLE IF NOT EXISTS issue_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  action TEXT NOT NULL,
  detail JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE issue_activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "issue_activity_logs: all" ON issue_activity_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Seed projects
INSERT INTO projects (name, description, status, pm_id, key_prefix)
SELECT 'Webサイトリニューアル', 'コーポレートサイトの全面リニューアル', 'active', id, 'WEB'
FROM users WHERE email = 'o.yasuda@meetsc.co.jp'
ON CONFLICT DO NOTHING;

INSERT INTO projects (name, description, status, pm_id, key_prefix)
SELECT 'ECサイト構築', 'オンラインストアの新規構築', 'active', id, 'EC'
FROM users WHERE email = 'o.yasuda@meetsc.co.jp'
ON CONFLICT DO NOTHING;

INSERT INTO projects (name, description, status, pm_id, key_prefix)
SELECT 'マーケティングキャンペーン', 'Q2マーケティング施策', 'planning', id, 'MKT'
FROM users WHERE email = 'o.yasuda@meetsc.co.jp'
ON CONFLICT DO NOTHING;

-- Link tasks to projects
UPDATE tasks SET project_id = (SELECT id FROM projects WHERE key_prefix = 'WEB')
WHERE title LIKE '%TOP%' OR title LIKE '%LP%' OR title LIKE '%コーディング%' OR title LIKE '%カタログ%';

UPDATE tasks SET project_id = (SELECT id FROM projects WHERE key_prefix = 'EC')
WHERE title LIKE '%EC%' OR title LIKE '%商品%';

UPDATE tasks SET project_id = (SELECT id FROM projects WHERE key_prefix = 'MKT')
WHERE title LIKE '%バナー%' OR title LIKE '%SNS%' OR title LIKE '%メルマガ%' OR title LIKE '%ニュースレター%' OR title LIKE '%広告%';

-- Seed issues
INSERT INTO issues (project_id, issue_key, type, severity, status, title, description, reproduction_steps, reported_by, source)
SELECT p.id, 'WEB-1', 'bug', 'high', 'open', 'TOPページのレスポンシブ崩れ', 'iPhone SEでヘッダーが重なる', '1. iPhone SEでアクセス 2. メニューをタップ', u.id, 'customer'
FROM projects p, users u WHERE p.key_prefix = 'WEB' AND u.email = 'o.yasuda@meetsc.co.jp';

INSERT INTO issues (project_id, issue_key, type, severity, status, title, reported_by, source)
SELECT p.id, 'WEB-2', 'improvement', 'medium', 'open', 'ダークモード全画面対応', u.id, 'internal'
FROM projects p, users u WHERE p.key_prefix = 'WEB' AND u.email = 'o.yasuda@meetsc.co.jp';

INSERT INTO issues (project_id, issue_key, type, severity, status, title, reproduction_steps, reported_by, source)
SELECT p.id, 'EC-1', 'bug', 'critical', 'in_progress', 'カート追加が500エラー', '1. 商品ページ→カート追加→500', u.id, 'customer'
FROM projects p, users u WHERE p.key_prefix = 'EC' AND u.email = 'o.yasuda@meetsc.co.jp';

INSERT INTO issues (project_id, issue_key, type, severity, status, title, reported_by, source)
SELECT p.id, 'MKT-1', 'question', 'low', 'open', 'SNSバナーサイズ確認', u.id, 'internal'
FROM projects p, users u WHERE p.key_prefix = 'MKT' AND u.email = 'o.yasuda@meetsc.co.jp';

UPDATE projects SET next_issue_seq = 3 WHERE key_prefix = 'WEB';
UPDATE projects SET next_issue_seq = 2 WHERE key_prefix = 'EC';
UPDATE projects SET next_issue_seq = 2 WHERE key_prefix = 'MKT';
