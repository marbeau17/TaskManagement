# WorkFlow v2.0 — プロジェクト階層 & 課題管理 仕様書

**バージョン**: v2.0
**作成日**: 2026-03-26
**参加者**: PM, テストマネージャー, 品質管理者, SWエンジニア, UATカスタマー責任者, テストエンジニア, R&Dマネージャー

---

## 1. 概要

JIRAライクなプロジェクト階層と課題(Issue)トラッキングを追加。

```
プロジェクト → タスク → 課題(Bug/Improvement/Question/Incident)
           → テストサイクル → テストケース → テスト実行
```

## 2. 実装フェーズ

| Phase | 内容 | 優先度 |
|-------|------|--------|
| **Phase 1** | プロジェクトを第一級エンティティに、タスクをプロジェクト配下に | 🔴 最優先 |
| **Phase 2** | 課題トラッキング（Bug/Improvement/Question/Incident） | 🔴 高 |
| **Phase 3** | 課題の関連、ラベル、SLA | 🟡 中 |
| **Phase 4** | テスト管理 | 🟡 中 |
| **Phase 5** | ダッシュボード・分析 | 🟢 低 |

## 3. データモデル

### projects テーブル
- id, name, description, status, pm_id, key_prefix, next_issue_seq, start_date, end_date

### issues テーブル
- id, project_id, issue_key(自動生成: PROJ-001), type, severity, priority, status
- title, description, reproduction_steps, expected_result, actual_result, environment(JSONB)
- source(internal/customer), reported_by, assigned_to, task_id
- resolution_notes, git_branch, git_pr_url, labels[], sla_deadlines
- reopen_count

### issue_comments, issue_attachments, issue_activity_logs, issue_relations

### test_cycles, test_cases, test_executions

## 4. 課題ステータスワークフロー

```
Open → In Progress → Resolved → Verified → Closed
  ↑        ↓            ↓          ↓
  └────────┘            └──────────┘ (リグレッション: reopen)
```

## 5. 課題種別ごとの必須フィールド

| フィールド | Bug | Improvement | Question | Incident |
|-----------|-----|-------------|----------|----------|
| 再現手順 | 必須 | - | - | 推奨 |
| 期待結果 | 必須 | 推奨 | - | - |
| 実際結果 | 必須 | - | - | 必須 |
| 環境情報 | 必須 | - | - | 必須 |

## 6. SLAデフォルト

| 重要度 | 応答時間 | 解決時間 |
|--------|---------|---------|
| Critical | 1時間 | 4時間 |
| High | 4時間 | 24時間 |
| Medium | 8時間 | 72時間 |
| Low | 24時間 | 1週間 |

## 7. 新規UI

- `/projects` — プロジェクト一覧（カード形式）
- `/projects/[id]` — プロジェクトダッシュボード（タスク/課題/テスト/メンバー）
- `/issues` — 全課題一覧
- `/issues/[id]` — 課題詳細（2カラム）
- `/issues/new` — 課題作成
- `/projects/[id]/tests` — テスト管理
