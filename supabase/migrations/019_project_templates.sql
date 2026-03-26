-- =============================================================================
-- 019: Project Templates - ability to create projects from templates
-- =============================================================================

CREATE TABLE IF NOT EXISTS project_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  default_statuses JSONB DEFAULT '["planning", "active", "on_hold", "completed", "archived"]',
  default_milestones JSONB DEFAULT '[]',
  default_tasks JSONB DEFAULT '[]',
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE project_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "project_templates: select" ON project_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "project_templates: manage" ON project_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Seed a few built-in project templates
INSERT INTO project_templates (name, description, default_statuses, default_milestones, default_tasks)
VALUES
  (
    'Webサイト制作',
    'Webサイトの新規制作・リニューアル用テンプレート',
    '["planning", "active", "on_hold", "completed", "archived"]',
    '[{"name": "要件定義", "offset_days": 0}, {"name": "デザイン", "offset_days": 14}, {"name": "実装", "offset_days": 28}, {"name": "テスト", "offset_days": 42}, {"name": "リリース", "offset_days": 56}]',
    '[{"title": "要件ヒアリング", "status": "waiting"}, {"title": "ワイヤーフレーム作成", "status": "waiting"}, {"title": "デザインカンプ作成", "status": "waiting"}, {"title": "コーディング", "status": "waiting"}, {"title": "テスト・検証", "status": "waiting"}, {"title": "本番公開", "status": "waiting"}]'
  ),
  (
    'マーケティングキャンペーン',
    'マーケティング施策の計画・実行用テンプレート',
    '["planning", "active", "on_hold", "completed", "archived"]',
    '[{"name": "企画", "offset_days": 0}, {"name": "制作", "offset_days": 7}, {"name": "配信", "offset_days": 21}, {"name": "効果測定", "offset_days": 35}]',
    '[{"title": "ターゲット設定", "status": "waiting"}, {"title": "コンテンツ企画", "status": "waiting"}, {"title": "クリエイティブ制作", "status": "waiting"}, {"title": "配信設定", "status": "waiting"}, {"title": "効果測定・レポート", "status": "waiting"}]'
  ),
  (
    'アプリ開発',
    'モバイル/Webアプリ開発用テンプレート',
    '["planning", "active", "on_hold", "completed", "archived"]',
    '[{"name": "要件定義", "offset_days": 0}, {"name": "設計", "offset_days": 14}, {"name": "開発 Sprint 1", "offset_days": 28}, {"name": "開発 Sprint 2", "offset_days": 42}, {"name": "QA", "offset_days": 56}, {"name": "リリース", "offset_days": 70}]',
    '[{"title": "要件定義書作成", "status": "waiting"}, {"title": "画面設計", "status": "waiting"}, {"title": "DB設計", "status": "waiting"}, {"title": "API開発", "status": "waiting"}, {"title": "フロントエンド開発", "status": "waiting"}, {"title": "結合テスト", "status": "waiting"}, {"title": "リリース準備", "status": "waiting"}]'
  )
ON CONFLICT DO NOTHING;
