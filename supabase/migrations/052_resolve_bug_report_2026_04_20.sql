-- 052_resolve_bug_report_2026_04_20.sql
-- Marks the issues from the 2026-04-20 bug report as resolved, with the fix
-- pointer in resolution_notes. Idempotent (UPDATE matched by issue_key).

UPDATE issues
SET
  status = 'resolved',
  resolution_notes = 'PATCH /api/members/[id] now allows self-updates of profile fields (name, name_short, avatar_color, avatar_url, email, phone, title, department, bio). Previously rejected with 403 for non-admin users.',
  resolved_at = now(),
  updated_at = now()
WHERE issue_key = 'WEB-42';

UPDATE issues
SET
  status = 'resolved',
  resolution_notes = '既存機能で対応可能です。タスク一覧画面の「依頼者（requested_by）」フィルタを使うと、自分が依頼したタスクを一覧化でき、そこから期限変更も可能です。担当者別フィルタ（assigned_by）の追加は今後の要望として別チケット化します。',
  resolved_at = now(),
  updated_at = now()
WHERE issue_key = 'WEB-41';

UPDATE issues
SET
  status = 'resolved',
  resolution_notes = 'getFileUrl() now uses createSignedUrl (1h expiry) instead of getPublicUrl, which returned an unsigned URL that 403-ed on the private attachments bucket.',
  resolved_at = now(),
  updated_at = now()
WHERE issue_key = 'WEB-40';

UPDATE issues
SET
  status = 'resolved',
  resolution_notes = 'project_members テーブルが DB に存在せず INSERT が失敗していました。migration 051_create_project_members.sql を追加して解消。',
  resolved_at = now(),
  updated_at = now()
WHERE issue_key = 'KEEPER-1';

UPDATE issues
SET
  status = 'resolved',
  resolution_notes = '<select> の onBlur が onChange より先に発火し、オプション選択が反映されない競合を修正。onBlur を setTimeout で遅延させ、onMouseDown にも stopPropagation を追加（TaskTable.tsx 856 付近）。',
  resolved_at = now(),
  updated_at = now()
WHERE issue_key = 'WEB-4';

UPDATE issues
SET
  status = 'resolved',
  resolution_notes = 'DateInput のカレンダーボタンを目立つサイズ・ツールチップ付きに調整。ボタンの位置・クリック領域が小さく気付きにくかった問題を解消。',
  resolved_at = now(),
  updated_at = now()
WHERE issue_key = 'WEB-39';

UPDATE issues
SET
  status = 'resolved',
  resolution_notes = 'DateInput の年セグメントで「2026-04-20」等のセパレータ付き文字列をペーストすると年が「0420」→1900 にクランプされる不具合を修正。セパレータ検出時に年/月/日へ分配するように変更し、クランプ条件も 4 桁時のみに限定。',
  resolved_at = now(),
  updated_at = now()
WHERE issue_key = 'BD-1';
