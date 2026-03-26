-- =============================================================================
-- 014: Milestones table for project milestone tracking (REQ-04)
-- =============================================================================

-- Milestones
CREATE TABLE IF NOT EXISTS milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT milestones_status_check CHECK (status IN ('pending', 'in_progress', 'completed', 'overdue'))
);

CREATE INDEX IF NOT EXISTS idx_milestones_project ON milestones(project_id);
CREATE INDEX IF NOT EXISTS idx_milestones_status ON milestones(status);
CREATE INDEX IF NOT EXISTS idx_milestones_due_date ON milestones(due_date);

ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "milestones: select" ON milestones FOR SELECT TO authenticated USING (true);
CREATE POLICY "milestones: manage" ON milestones FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Seed milestone data
INSERT INTO milestones (project_id, title, description, due_date, status)
SELECT p.id, 'デザイン完了', 'ワイヤーフレーム・デザインカンプの完了', '2026-04-15', 'in_progress'
FROM projects p WHERE p.key_prefix = 'WEB';

INSERT INTO milestones (project_id, title, description, due_date, status)
SELECT p.id, 'コーディング完了', 'フロントエンド実装の完了', '2026-05-30', 'pending'
FROM projects p WHERE p.key_prefix = 'WEB';

INSERT INTO milestones (project_id, title, description, due_date, status)
SELECT p.id, 'リリース', '本番環境へのデプロイ', '2026-06-30', 'pending'
FROM projects p WHERE p.key_prefix = 'WEB';

INSERT INTO milestones (project_id, title, description, due_date, status)
SELECT p.id, '要件定義完了', 'ECサイト要件の確定', '2026-03-31', 'completed'
FROM projects p WHERE p.key_prefix = 'EC';

INSERT INTO milestones (project_id, title, description, due_date, status)
SELECT p.id, 'ベータリリース', 'ベータ版の公開', '2026-05-15', 'pending'
FROM projects p WHERE p.key_prefix = 'EC';
