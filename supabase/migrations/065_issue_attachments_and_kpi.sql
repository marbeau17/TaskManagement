-- =============================================================================
-- 065: Issue attachments + KPI helpers
-- - attachments テーブルを issue にも紐付け可能にする (task_id を nullable に緩和)
-- - issue_id 列を追加し、task_id か issue_id のどちらか必須の CHECK 制約
-- - issue.first_responded_at を埋める trigger (MTTA 計測用)
-- - KPI 用 view (issue_kpi_summary)
-- =============================================================================

-- 1) attachments を issue にも対応させる ------------------------------------
ALTER TABLE attachments
  ADD COLUMN IF NOT EXISTS issue_id UUID REFERENCES issues(id) ON DELETE CASCADE;

ALTER TABLE attachments
  ALTER COLUMN task_id DROP NOT NULL;

-- task_id か issue_id のいずれかが必須 (両方 NULL を禁止)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'attachments_target_check'
  ) THEN
    ALTER TABLE attachments
      ADD CONSTRAINT attachments_target_check
      CHECK (task_id IS NOT NULL OR issue_id IS NOT NULL);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_attachments_issue_id ON attachments (issue_id);

-- attachments RLS は既存 (007) で authenticated に対して select / all を許可済み
-- issue_id 列追加だけでは追加ポリシー不要

-- 2) issue.first_responded_at を comment / status_change で自動更新 ------------
-- MTTA (Mean Time To Acknowledge) 計測のため、報告者以外が最初に介入したタイミングを記録
CREATE OR REPLACE FUNCTION mark_issue_first_response()
RETURNS TRIGGER AS $$
DECLARE
  issue_row issues%ROWTYPE;
BEGIN
  SELECT * INTO issue_row FROM issues WHERE id = NEW.issue_id;
  IF issue_row.first_responded_at IS NULL AND NEW.user_id <> issue_row.reported_by THEN
    UPDATE issues SET first_responded_at = now() WHERE id = NEW.issue_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_issue_comment_first_response ON issue_comments;
CREATE TRIGGER trg_issue_comment_first_response
  AFTER INSERT ON issue_comments
  FOR EACH ROW EXECUTE FUNCTION mark_issue_first_response();

DROP TRIGGER IF EXISTS trg_issue_activity_first_response ON issue_activity_logs;
CREATE TRIGGER trg_issue_activity_first_response
  AFTER INSERT ON issue_activity_logs
  FOR EACH ROW EXECUTE FUNCTION mark_issue_first_response();

-- 3) reopen_count を status open 復帰時に増やす trigger -----------------------
CREATE OR REPLACE FUNCTION bump_issue_reopen_count()
RETURNS TRIGGER AS $$
BEGIN
  -- resolved/closed/verified → open/in_progress に戻った場合のみインクリメント
  IF NEW.status IN ('open', 'in_progress')
     AND OLD.status IN ('resolved', 'closed', 'verified') THEN
    NEW.reopen_count := COALESCE(OLD.reopen_count, 0) + 1;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_issue_reopen_count ON issues;
CREATE TRIGGER trg_issue_reopen_count
  BEFORE UPDATE OF status ON issues
  FOR EACH ROW EXECUTE FUNCTION bump_issue_reopen_count();

-- 4) KPI 用集計 view ---------------------------------------------------------
-- 障害管理者ダッシュボードが期間フィルタ + severity / project / source 軸で
-- 集計しやすいよう、issue 1 件 1 行で派生指標を計算した view を提供。
-- RLS は base table (issues) を継承するため、認証ユーザーが読める範囲のみ可視。

CREATE OR REPLACE VIEW issue_kpi_summary AS
SELECT
  i.id,
  i.issue_key,
  i.project_id,
  i.type,
  i.severity,
  i.status,
  i.source,
  i.assigned_to,
  i.reported_by,
  i.created_at,
  i.first_responded_at,
  i.resolved_at,
  i.closed_at,
  i.reopen_count,
  i.sla_response_deadline,
  i.sla_resolution_deadline,
  -- MTTA: created → first_responded (時間単位)
  EXTRACT(EPOCH FROM (i.first_responded_at - i.created_at)) / 3600.0
    AS hours_to_first_response,
  -- MTTR: created → resolved (時間単位)
  EXTRACT(EPOCH FROM (i.resolved_at - i.created_at)) / 3600.0
    AS hours_to_resolve,
  -- Aging (Open 限定で意味を持つ — 経過日数)
  CASE
    WHEN i.status IN ('open', 'in_progress')
      THEN EXTRACT(EPOCH FROM (now() - i.created_at)) / 86400.0
    ELSE NULL
  END AS open_age_days,
  -- SLA 達成可否
  CASE
    WHEN i.sla_response_deadline IS NULL THEN NULL
    WHEN i.first_responded_at IS NULL AND now() > i.sla_response_deadline THEN false
    WHEN i.first_responded_at IS NOT NULL AND i.first_responded_at <= i.sla_response_deadline THEN true
    WHEN i.first_responded_at IS NOT NULL AND i.first_responded_at > i.sla_response_deadline THEN false
    ELSE NULL
  END AS sla_response_hit,
  CASE
    WHEN i.sla_resolution_deadline IS NULL THEN NULL
    WHEN i.resolved_at IS NULL AND now() > i.sla_resolution_deadline THEN false
    WHEN i.resolved_at IS NOT NULL AND i.resolved_at <= i.sla_resolution_deadline THEN true
    WHEN i.resolved_at IS NOT NULL AND i.resolved_at > i.sla_resolution_deadline THEN false
    ELSE NULL
  END AS sla_resolution_hit
FROM issues i;

GRANT SELECT ON issue_kpi_summary TO authenticated;
