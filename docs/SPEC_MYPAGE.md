# My Page 機能仕様書 — WorkFlow タスク管理ツール

**バージョン**: v1.0
**作成日**: 2026-04-02
**ステータス**: ドラフト
**方針**: 既存機能に影響を与えない追加実装

---

## 0. エージェントレビューボード

| # | エージェント | 担当領域 |
|---|-------------|----------|
| A01 | **Product Owner** | スコープ定義・優先度・既存機能との棲み分け |
| A02 | **UI/UX Engineer** | 画面設計・インタラクション・情報密度 |
| A03 | **Software Engineer (Frontend)** | React/Next.js実装・状態管理・パフォーマンス |
| A04 | **Backend Engineer** | クエリ設計・API・データ集計 |
| A05 | **QA Engineer** | テスト戦略・エッジケース |
| A06 | **Project Manager** | 既存ダッシュボードとの整合・導入計画 |
| A07 | **Security Engineer** | アクセス制御・自分のデータのみ表示保証 |
| A08 | **i18n Engineer** | 翻訳キー設計 |
| A09 | **Data Analyst** | WARNING指標・閾値設計・可視化 |
| A10 | **Compatibility Engineer** | 既存コンポーネント再利用・非破壊保証 |

---

## 1. 概要

### 1.1 目的

各ユーザーが自分専用のページ（My Page）で **本日やるべきこと・今週やるべきこと・注意すべき警告・対応すべき問題** を一目で把握できるようにする。

> **[A01 Product Owner]** 現在のダッシュボード（`/dashboard`）はチーム全体の俯瞰ビュー。My Page は「自分に関係することだけ」にフォーカスした個人ビュー。この2つは補完関係であり、ダッシュボードの機能は一切変更しない。

> **[A06 Project Manager]** 既存の `/dashboard` は全員がチーム状況を確認する場所として維持。My Page は朝一番に開いて「今日何をやるか」を確認する場所。サイドバーのランディングページ候補でもある。

> **[A10 Compatibility Engineer]** 新規ルート `/mypage` を追加するのみ。既存コンポーネント（`DeadlineAlerts`, `RecentActivity` 等）はフィルタ付きで再利用。既存ファイルの変更は Sidebar.tsx へのナビ追加のみ。

### 1.2 スコープ

| 含まれる | 含まれない |
|---------|-----------|
| 本日のタスク一覧 | チーム全体のKPI（→ `/dashboard`） |
| 今週のタスク一覧 | ガントチャート（→ `/tasks`） |
| WARNINGポイント（締切・稼働率・滞留） | 他メンバーのタスク |
| 担当Issue一覧（未解決） | Issue作成（→ `/issues`） |
| 個人アクティビティ履歴 | プロジェクト管理（→ `/projects`） |
| 個人稼働サマリー | キャパシティ計画（→ `/workload`） |

---

## 2. ルーティングとナビゲーション

### 2.1 ルート

```
/mypage    → My Page（認証必須）
```

> **[A03 Software Engineer]** `src/app/(main)/mypage/page.tsx` に配置。`(main)` レイアウトグループ内なので既存の認証ガード・Shell・サイドバーがそのまま適用される。

### 2.2 サイドバー変更

```typescript
// Sidebar.tsx — MAIN_NAV 配列の先頭付近に追加
const MAIN_NAV = [
  { id: 'news', labelKey: 'nav.news', icon: '📢', href: '/news' },
  { id: 'mypage', labelKey: 'nav.mypage', icon: '👤', href: '/mypage' },  // NEW
  { id: 'dashboard', labelKey: 'nav.dashboard', icon: '📊', href: '/dashboard' },
  // ... 以下既存のまま
]
```

> **[A02 UI/UX Engineer]** News の直下、Dashboard の直上に配置。ログイン後最初に目に入る位置。アイコンは `👤` で個人ページを直感的に表現。

> **[A10 Compatibility Engineer]** Sidebar.tsx への変更はこの1行の追加のみ。MAIN_NAV 配列に要素を追加するだけなので既存ナビに影響なし。

---

## 3. 画面設計

### 3.1 全体レイアウト

```
┌─────────────────────────────────────────────────────────────────┐
│  👤 My Page — {ユーザー名}                    2026/04/02 (水)   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─ 稼働サマリー ─────────────────────────────────────────────┐ │
│  │ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │ │
│  │ │ 本日タスク │ │今週タスク  │ │ 稼働率    │ │ 未解決Issue│     │ │
│  │ │   3件     │ │  12件     │ │  78%     │ │   5件     │      │ │
│  │ └──────────┘ └──────────┘ └──────────┘ └──────────┘      │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌─ ⚠ WARNINGポイント ───────────────────────────────────────┐ │
│  │ 🔴 締切超過: 「LP制作」 — 3/30期限 (3日超過)              │ │
│  │ 🟡 明日締切: 「API設計書レビュー」 — 4/3期限               │ │
│  │ 🟡 稼働率注意: 今週 92% (閾値: 80%)                       │ │
│  │ 🟠 滞留タスク: 「DB設計」 in_progress 14日間変更なし       │ │
│  │ 🔴 Critical Issue: ISS-042「本番エラー」未対応             │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌─ 本日のタスク (4/2) ───────────────┐ ┌─ 担当Issue ────────┐ │
│  │ P  タイトル         進捗  締切      │ │ Key    タイトル  重要度│ │
│  │ ── ─────────────── ──── ─────      │ │ ────── ──────── ────│ │
│  │ P1 LP制作           60%  ⚠3/30    │ │ ISS-42 本番エラー 🔴 │ │
│  │ P2 API設計書レビュー  0%  ⚠4/3    │ │ ISS-38 UI崩れ   🟡  │ │
│  │ P3 テストケース作成  30%  4/5      │ │ ISS-35 改善要望  🟢  │ │
│  │                                     │ │                     │ │
│  │ [タスク一覧を見る →]               │ │ [Issue一覧を見る →] │ │
│  └─────────────────────────────────────┘ └─────────────────────┘ │
│                                                                  │
│  ┌─ 今週のタスク (3/31 — 4/6) ────────────────────────────────┐ │
│  │ P  タイトル             ステータス  進捗  締切   工数        │ │
│  │ ── ──────────────────── ────────  ──── ─────  ────         │ │
│  │ P1 LP制作               ▶ 進行中   60%  ⚠3/30  8h/12h    │ │
│  │ P2 API設計書レビュー     📋 未着手   0%  ⚠4/3   —/4h     │ │
│  │ P3 テストケース作成      ▶ 進行中   30%  4/5    2h/6h     │ │
│  │ P3 画面デザインFB        📋 未着手   0%  4/6    —/3h      │ │
│  │ P2 データ移行スクリプト  ▶ 進行中   80%  4/4    5h/8h     │ │
│  │ ... (合計 12件)                                             │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌─ 最近のアクティビティ ─────────────────────────────────────┐ │
│  │ 10:30  ▶ 「テストケース作成」進捗 20% → 30%              │ │
│  │ 09:15  💬 「LP制作」にコメント追加                         │ │
│  │ 昨日   ✓ 「要件定義書」完了                                │ │
│  │ 昨日   📋 「API設計書レビュー」がアサインされました        │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

> **[A02 UI/UX Engineer]** 上から順に「状況把握→警告確認→今日のアクション→今週の全体像→履歴」という認知フロー。最も重要な WARNING を画面上部に固定配置。

> **[A09 Data Analyst]** WARNINGセクションは0件の場合「問題ありません」メッセージを表示し、存在感を維持する。常に見える位置にあることで「確認済み」の安心感を与える。

### 3.2 セクション詳細

#### 3.2.1 稼働サマリーカード

| カード | 値の算出 | 色分け |
|--------|---------|--------|
| 本日タスク | 締切 = today かつ status ∈ {todo, in_progress} + 本日締切でない進行中タスク | — |
| 今週タスク | 今週締切 かつ status ∉ {done, dropped, rejected} | — |
| 稼働率 | `actual_hours / weekly_capacity_hours * 100` | 🟢 <80%, 🟡 80-99%, 🔴 ≥100% |
| 未解決Issue | assigned_to = me かつ status ∈ {open, in_progress} | 🔴 critical含む, 🟡 high含む, 🟢 それ以外 |

> **[A04 Backend Engineer]** 稼働率は既存の `useWorkloadSummaries` のロジックを再利用。個人フィルタで1人分だけ取得するヘルパーを追加。

#### 3.2.2 WARNINGポイント

> **[A09 Data Analyst]** WARNINGは以下5カテゴリ。深刻度順にソート。

| # | WARNING種別 | 条件 | 深刻度 | アイコン |
|---|------------|------|--------|---------|
| W1 | 締切超過 | deadline < today かつ status ∉ {done, dropped, rejected} | 🔴 Critical | `AlertTriangle` |
| W2 | 締切間近 | deadline ≤ today + 3日 かつ status ∉ {done, dropped, rejected} | 🟡 Warning | `Clock` |
| W3 | 稼働率超過 | utilization_rate ≥ 80% | 🟡 Warning (80-99%), 🔴 Critical (≥100%) | `TrendingUp` |
| W4 | タスク滞留 | status = in_progress かつ updated_at < today - 7日 | 🟠 Caution | `Pause` |
| W5 | Critical/High Issue | assigned_to = me かつ severity ∈ {critical, high} かつ status ∈ {open, in_progress} | 🔴/🟡 | `Bug` |

```typescript
// WARNING 型定義
interface MyPageWarning {
  id: string
  type: 'overdue' | 'deadline_soon' | 'overloaded' | 'stale_task' | 'critical_issue'
  severity: 'critical' | 'warning' | 'caution'
  title: string
  description: string
  link: string              // クリックで該当タスク/Issue に遷移
  entity_type: 'task' | 'issue' | 'workload'
  entity_id?: string
  days?: number             // 超過日数 or 残日数 or 滞留日数
}
```

> **[A09 Data Analyst]** 滞留タスクの閾値（7日）は `APP_CONFIG` に追加: `alerts.staleTaskDays: 7`。締切間近の閾値は既存の `deadlineSoonDays: 3` を再利用。

> **[A01 Product Owner]** WARNING はクリッカブル。タップでそのタスク/Issue の詳細に遷移する。

#### 3.2.3 本日のタスク

```typescript
// 抽出条件
const todayTasks = tasks.filter(t =>
  t.assigned_to === currentUser.id &&        // 自分がアサインされている
  t.status !== 'done' &&
  t.status !== 'dropped' &&
  t.status !== 'rejected' && (
    getDeadline(t) === today ||              // 締切が今日
    t.status === 'in_progress'               // または進行中（締切関係なく）
  )
)

// ソート: 優先度(昇順) → 締切(昇順) → 作成日(昇順)
```

表示カラム:
| カラム | 内容 |
|--------|------|
| 優先度 | P1-P5 バッジ（既存 `PriorityBadge` 再利用） |
| タイトル | タスク名（クリックで詳細遷移） |
| 進捗 | プログレスバー + % |
| 締切 | 日付（超過は赤、今日は黄、それ以外は通常） |

> **[A10 Compatibility Engineer]** `PriorityBadge`, `StatusChip`, プログレスバーは既存 shared コンポーネントをそのまま使用。新規作成不要。

#### 3.2.4 担当Issue

```typescript
// 抽出条件
const myIssues = issues.filter(i =>
  i.assigned_to === currentUser.id &&
  ['open', 'in_progress'].includes(i.status)
)

// ソート: severity (critical > high > medium > low) → created_at (古い順)
```

表示カラム:
| カラム | 内容 |
|--------|------|
| Issue Key | `ISS-042` 形式（クリックで詳細遷移） |
| タイトル | Issue名 |
| 重要度 | SeverityBadge（🔴 critical, 🟡 high, 🟢 medium, ⚪ low） |
| ステータス | `IssueStatusBadge`（既存コンポーネント再利用） |
| 経過日数 | 作成からの日数 |

#### 3.2.5 今週のタスク

```typescript
// 抽出条件
const weekStart = startOfWeek(today, { weekStartsOn: 1 }) // 月曜始まり
const weekEnd = endOfWeek(today, { weekStartsOn: 1 })

const weekTasks = tasks.filter(t =>
  t.assigned_to === currentUser.id &&
  t.status !== 'done' &&
  t.status !== 'dropped' &&
  t.status !== 'rejected' && (
    (getDeadline(t) >= weekStart && getDeadline(t) <= weekEnd) || // 今週締切
    t.status === 'in_progress'                                     // または進行中
  )
)
```

表示カラム:
| カラム | 内容 |
|--------|------|
| 優先度 | P1-P5 バッジ |
| タイトル | タスク名（クリックで詳細遷移） |
| ステータス | StatusChip（既存コンポーネント） |
| 進捗 | プログレスバー + % |
| 締切 | 日付（色分け） |
| 工数 | `actual_hours` / `estimated_hours` |

> **[A02 UI/UX Engineer]** 今週タスクはデフォルト全表示。10件以上の場合は折りたたみ（"さらに表示"）。タイトルクリックで `/tasks/[id]` に遷移。

#### 3.2.6 最近のアクティビティ

```typescript
// 抽出条件
const myActivities = activityLogs.filter(a =>
  a.user_id === currentUser.id
)
// 直近20件、時系列降順
```

> **[A10 Compatibility Engineer]** 既存 `RecentActivity` コンポーネントを参考にするが、ユーザーフィルタ版を新規作成（`MyRecentActivity`）。既存コンポーネントは変更しない。

---

## 4. データ取得設計

### 4.1 API エンドポイント

> **[A04 Backend Engineer]** 新規 API は1本に集約。クライアントサイドで複数 hook を並行呼び出しするより、サーバーサイドで1回の集計を返す方がパフォーマンスが良い。ただし既存APIの再利用も並行して行う。

```
src/app/api/mypage/
└── route.ts    GET: My Page 集約データ取得
```

```typescript
// GET /api/mypage
// 認証必須（auth.uid() から自動でユーザー特定）

interface MyPageResponse {
  // サマリーカード
  summary: {
    today_task_count: number
    week_task_count: number
    utilization_rate: number
    open_issue_count: number
    has_critical_issue: boolean
    has_high_issue: boolean
  }

  // WARNINGポイント
  warnings: MyPageWarning[]

  // 本日のタスク
  today_tasks: TaskWithRelations[]

  // 今週のタスク
  week_tasks: TaskWithRelations[]

  // 担当Issue
  my_issues: Issue[]

  // 最近のアクティビティ
  recent_activities: ActivityLog[]
}
```

> **[A03 Software Engineer]** 画面のセクションごとに個別フェッチも可能だが、初期ロードを1リクエストにまとめることでスピナーのちらつきを抑える。個別セクションのリフレッシュは既存 hook（`useTasks`, `useIssues`）で補完。

### 4.2 データレイヤー

```typescript
// src/lib/data/mypage.ts

import { createServerClient } from '@/lib/supabase/server'
import { isMockMode } from '@/lib/mock/utils'
import { startOfWeek, endOfWeek, format, subDays, isAfter, isBefore, isToday } from 'date-fns'
import { APP_CONFIG } from '@/lib/config'
import type { MyPageResponse, MyPageWarning } from '@/types/mypage'

export async function getMyPageData(userId: string): Promise<MyPageResponse> {
  if (isMockMode()) {
    return getMockMyPageData(userId)
  }

  const supabase = await createServerClient()
  const today = new Date()
  const todayStr = format(today, 'yyyy-MM-dd')
  const weekStart = startOfWeek(today, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 })
  const weekStartStr = format(weekStart, 'yyyy-MM-dd')
  const weekEndStr = format(weekEnd, 'yyyy-MM-dd')
  const staleDate = format(subDays(today, APP_CONFIG.alerts.staleTaskDays), 'yyyy-MM-dd')
  const soonDate = format(
    new Date(today.getTime() + APP_CONFIG.alerts.deadlineSoonDays * 86400000),
    'yyyy-MM-dd'
  )

  // 並行クエリ実行
  const [tasksResult, issuesResult, activitiesResult, userResult] = await Promise.all([
    // 自分にアサインされた未完了タスク（全件）
    supabase
      .from('tasks')
      .select(`*, client:clients(id, name), project:projects(id, name),
               assigned_user:users!tasks_assigned_to_fkey(id, name, avatar_color),
               requester:users!tasks_requested_by_fkey(id, name)`)
      .eq('assigned_to', userId)
      .not('status', 'in', '("done","dropped","rejected")')
      .order('priority', { ascending: true }),

    // 自分にアサインされた未解決Issue
    supabase
      .from('issues')
      .select(`*, project:projects(id, name), reporter:users!issues_reported_by_fkey(id, name)`)
      .eq('assigned_to', userId)
      .in('status', ['open', 'in_progress'])
      .order('severity', { ascending: true }),

    // 自分の最近のアクティビティ
    supabase
      .from('activity_logs')
      .select(`*, user:users(id, name, avatar_color)`)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20),

    // 自分のユーザー情報（稼働率算出用）
    supabase
      .from('users')
      .select('weekly_capacity_hours')
      .eq('id', userId)
      .single(),
  ])

  const tasks = tasksResult.data ?? []
  const issues = issuesResult.data ?? []
  const activities = activitiesResult.data ?? []
  const capacityHours = userResult.data?.weekly_capacity_hours ?? 40

  // --- 分類 ---
  const todayTasks = tasks.filter(t => /* 本日タスク条件 */ )
  const weekTasks = tasks.filter(t => /* 今週タスク条件 */ )
  
  // --- 稼働率 ---
  const totalActualHours = tasks.reduce((sum, t) => sum + (t.actual_hours || 0), 0)
  const utilizationRate = Math.round((totalActualHours / capacityHours) * 100)

  // --- WARNING生成 ---
  const warnings = buildWarnings(tasks, issues, utilizationRate, todayStr, soonDate, staleDate)

  return {
    summary: { /* ... */ },
    warnings,
    today_tasks: todayTasks,
    week_tasks: weekTasks,
    my_issues: issues,
    recent_activities: activities,
  }
}
```

### 4.3 Hook設計

```typescript
// src/hooks/useMyPage.ts

import { useQuery } from '@tanstack/react-query'
import { useAuth } from './useAuth'

export function useMyPage() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['mypage', user?.id],
    queryFn: () => fetch('/api/mypage').then(r => r.json()),
    enabled: !!user,
    staleTime: APP_CONFIG.cache.queryStaleTimeMs,    // 60秒
    refetchInterval: 5 * 60 * 1000,                  // 5分自動リフレッシュ
  })
}
```

> **[A03 Software Engineer]** 5分ごとの自動リフレッシュで常に最新を表示。手動リフレッシュボタンも配置。タスク更新などのミューテーション後は `queryClient.invalidateQueries(['mypage'])` で即時反映。

---

## 5. WARNING ロジック詳細

> **[A09 Data Analyst]** WARNINGの生成ロジックを厳密に定義する。

### 5.1 W1: 締切超過

```typescript
function checkOverdueTasks(tasks: Task[], today: string): MyPageWarning[] {
  return tasks
    .filter(t => {
      const deadline = t.confirmed_deadline || t.desired_deadline
      return deadline && deadline < today
    })
    .map(t => {
      const deadline = t.confirmed_deadline || t.desired_deadline
      const overdueDays = differenceInDays(new Date(today), new Date(deadline!))
      return {
        id: `overdue-${t.id}`,
        type: 'overdue',
        severity: 'critical',
        title: t.title,
        description: `${overdueDays}日超過（期限: ${deadline}）`,
        link: `/tasks/${t.id}`,
        entity_type: 'task',
        entity_id: t.id,
        days: overdueDays,
      }
    })
}
```

### 5.2 W2: 締切間近

```typescript
function checkDeadlineSoon(tasks: Task[], today: string, soonDate: string): MyPageWarning[] {
  return tasks
    .filter(t => {
      const deadline = t.confirmed_deadline || t.desired_deadline
      return deadline && deadline >= today && deadline <= soonDate
    })
    .map(t => {
      const deadline = t.confirmed_deadline || t.desired_deadline
      const daysLeft = differenceInDays(new Date(deadline!), new Date(today))
      return {
        id: `soon-${t.id}`,
        type: 'deadline_soon',
        severity: 'warning',
        title: t.title,
        description: daysLeft === 0
          ? '本日締切'
          : `あと${daysLeft}日（期限: ${deadline}）`,
        link: `/tasks/${t.id}`,
        entity_type: 'task',
        entity_id: t.id,
        days: daysLeft,
      }
    })
}
```

### 5.3 W3: 稼働率超過

```typescript
function checkWorkloadWarning(utilizationRate: number): MyPageWarning | null {
  if (utilizationRate >= 100) {
    return {
      id: 'workload-critical',
      type: 'overloaded',
      severity: 'critical',
      title: '稼働率超過',
      description: `今週の稼働率: ${utilizationRate}%（上限: 100%）`,
      link: '/workload',
      entity_type: 'workload',
    }
  }
  if (utilizationRate >= APP_CONFIG.workload.warningThreshold) {
    return {
      id: 'workload-warning',
      type: 'overloaded',
      severity: 'warning',
      title: '稼働率注意',
      description: `今週の稼働率: ${utilizationRate}%（閾値: ${APP_CONFIG.workload.warningThreshold}%）`,
      link: '/workload',
      entity_type: 'workload',
    }
  }
  return null
}
```

### 5.4 W4: タスク滞留

```typescript
function checkStaleTasks(tasks: Task[], staleDate: string): MyPageWarning[] {
  return tasks
    .filter(t =>
      t.status === 'in_progress' &&
      t.updated_at < staleDate
    )
    .map(t => {
      const staleDays = differenceInDays(new Date(), new Date(t.updated_at))
      return {
        id: `stale-${t.id}`,
        type: 'stale_task',
        severity: 'caution',
        title: t.title,
        description: `${staleDays}日間更新なし（ステータス: 進行中）`,
        link: `/tasks/${t.id}`,
        entity_type: 'task',
        entity_id: t.id,
        days: staleDays,
      }
    })
}
```

### 5.5 W5: 重要Issue未対応

```typescript
function checkCriticalIssues(issues: Issue[]): MyPageWarning[] {
  return issues
    .filter(i => ['critical', 'high'].includes(i.severity))
    .map(i => ({
      id: `issue-${i.id}`,
      type: 'critical_issue',
      severity: i.severity === 'critical' ? 'critical' : 'warning',
      title: `${i.issue_key}: ${i.title}`,
      description: `${i.severity === 'critical' ? 'Critical' : 'High'} Issue — ${i.status === 'open' ? '未着手' : '対応中'}`,
      link: `/issues/${i.id}`,
      entity_type: 'issue',
      entity_id: i.id,
    }))
}
```

### 5.6 WARNINGソート順

```
1. severity: critical → warning → caution
2. type: overdue → critical_issue → deadline_soon → overloaded → stale_task
3. days: 超過日数の多い順 / 残日数の少ない順
```

---

## 6. 型定義

```typescript
// src/types/mypage.ts

import type { TaskWithRelations } from './database'
import type { Issue } from './issue'
import type { ActivityLog } from './database'

// ---------------------------------------------------------------------------
// Warning Types
// ---------------------------------------------------------------------------

export type WarningType = 'overdue' | 'deadline_soon' | 'overloaded' | 'stale_task' | 'critical_issue'
export type WarningSeverity = 'critical' | 'warning' | 'caution'

export interface MyPageWarning {
  id: string
  type: WarningType
  severity: WarningSeverity
  title: string
  description: string
  link: string
  entity_type: 'task' | 'issue' | 'workload'
  entity_id?: string
  days?: number
}

// ---------------------------------------------------------------------------
// Summary Types
// ---------------------------------------------------------------------------

export interface MyPageSummary {
  today_task_count: number
  week_task_count: number
  utilization_rate: number
  open_issue_count: number
  has_critical_issue: boolean
  has_high_issue: boolean
}

// ---------------------------------------------------------------------------
// Aggregated Response
// ---------------------------------------------------------------------------

export interface MyPageData {
  summary: MyPageSummary
  warnings: MyPageWarning[]
  today_tasks: TaskWithRelations[]
  week_tasks: TaskWithRelations[]
  my_issues: Issue[]
  recent_activities: ActivityLog[]
}
```

---

## 7. コンポーネント設計

### 7.1 ディレクトリ構造

```
src/
├── app/(main)/mypage/
│   ├── page.tsx                     # ページコンポーネント
│   └── loading.tsx                  # スケルトンローダー
├── components/mypage/
│   ├── MyPageSummaryCards.tsx        # 稼働サマリー4カード
│   ├── MyPageWarnings.tsx           # WARNINGポイント一覧
│   ├── MyTodayTasks.tsx             # 本日のタスク
│   ├── MyWeekTasks.tsx              # 今週のタスク
│   ├── MyIssues.tsx                 # 担当Issue一覧
│   └── MyRecentActivity.tsx         # 個人アクティビティ
├── hooks/
│   └── useMyPage.ts                 # データ取得hook
├── lib/data/
│   └── mypage.ts                    # データレイヤー
└── types/
    └── mypage.ts                    # 型定義
```

### 7.2 変更が必要な既存ファイル

> **[A10 Compatibility Engineer]** 既存ファイルへの変更は最小限に留める。

| ファイル | 変更内容 | リスク |
|---------|---------|--------|
| `src/components/layout/Sidebar.tsx` | MAIN_NAV 配列に1要素追加 | 極低 |
| `src/lib/i18n/translations.ts` | `mypage.*` キー追加（末尾に追記） | 極低 |
| `src/lib/config.ts` | `alerts.staleTaskDays: 7` 追加 | 極低 |

**変更しないファイル:**
- `src/app/(main)/dashboard/page.tsx` — 変更なし
- `src/components/dashboard/*` — 変更なし
- `src/hooks/useTasks.ts` — 変更なし
- `src/hooks/useIssues.ts` — 変更なし
- `src/lib/data/tasks.ts` — 変更なし
- `src/lib/data/issues.ts` — 変更なし

### 7.3 コンポーネント仕様

#### MyPageSummaryCards.tsx

```
Props: { summary: MyPageSummary }
Layout: 4カード横並び（モバイルは2x2グリッド）
スタイル: 既存 KpiCards パターン準拠
  - bg-surface border-border2 rounded-[10px] p-4
  - 数値は text-2xl font-bold
  - ラベルは text-sm text-muted-foreground
稼働率カードの色分け:
  - < 80%: text-emerald-500
  - 80-99%: text-amber-500
  - ≥ 100%: text-red-500
Issue カードのアクセント:
  - has_critical_issue → 赤ドットインジケーター
  - has_high_issue → 黄ドットインジケーター
```

#### MyPageWarnings.tsx

```
Props: { warnings: MyPageWarning[] }
Layout: 縦スタック、各WARNING は1行
スタイル: severity に応じた左ボーダー色
  - critical: border-l-4 border-red-500 bg-red-50 dark:bg-red-950/20
  - warning: border-l-4 border-amber-500 bg-amber-50 dark:bg-amber-950/20
  - caution: border-l-4 border-orange-400 bg-orange-50 dark:bg-orange-950/20
アクション: 各行クリックで warning.link に遷移
0件時: "✅ 問題は検出されていません" メッセージ（緑ボーダー）
```

#### MyTodayTasks.tsx / MyWeekTasks.tsx

```
Props: { tasks: TaskWithRelations[], title: string }
Layout: テーブル形式（モバイルはカード形式に切替）
再利用: PriorityBadge, StatusChip, ProgressBar は既存 shared から import
リンク: タスク名クリック → /tasks/[id]
フッター: "タスク一覧を見る →" リンク → /tasks?assigned_to={userId}
空状態: "本日のタスクはありません" / "今週のタスクはありません"
```

#### MyIssues.tsx

```
Props: { issues: Issue[] }
Layout: コンパクトテーブル
再利用: IssueStatusBadge（既存 shared コンポーネント）
リンク: Issue Key クリック → /issues/[id]
フッター: "Issue一覧を見る →" リンク → /issues?assigned_to={userId}
空状態: "未解決のIssueはありません"
```

#### MyRecentActivity.tsx

```
Props: { activities: ActivityLog[] }
Layout: タイムライン形式（既存 RecentActivity 参考）
表示: 直近20件、初期表示10件 + "もっと見る"
新規作成の理由: 既存 RecentActivity はチーム全体用でフィルタ機構なし
  → 同じUIパターンだが user_id フィルタ済みデータを受け取る新コンポーネント
```

---

## 8. レスポンシブ設計

> **[A02 UI/UX Engineer]**

| ブレークポイント | レイアウト |
|----------------|-----------|
| `< 768px` (モバイル) | 1カラム。サマリーカード2x2。タスクはカード表示。 |
| `768px - 1023px` (タブレット) | 1カラム。サマリーカード4横並び。タスクはテーブル。 |
| `≥ 1024px` (デスクトップ) | 本日タスクとIssueが2カラム横並び。それ以外は1カラム。 |

```
Desktop:
┌──────────────────────────────────────────┐
│  Summary Cards (4 col)                    │
├──────────────────────────────────────────┤
│  Warnings (full width)                    │
├──────────────────────┬───────────────────┤
│  Today Tasks         │  My Issues         │
├──────────────────────┴───────────────────┤
│  Week Tasks (full width)                  │
├──────────────────────────────────────────┤
│  Recent Activity (full width)             │
└──────────────────────────────────────────┘

Mobile:
┌───────────────────┐
│  Summary (2x2)     │
├───────────────────┤
│  Warnings          │
├───────────────────┤
│  Today Tasks       │
├───────────────────┤
│  My Issues         │
├───────────────────┤
│  Week Tasks        │
├───────────────────┤
│  Recent Activity   │
└───────────────────┘
```

---

## 9. i18n キー

> **[A08 i18n Engineer]** `mypage.*` プレフィックスで名前空間分離。約50キー。

```typescript
// Navigation
'nav.mypage': 'マイページ' / 'My Page'

// Header
'mypage.title': 'マイページ' / 'My Page'
'mypage.greeting': 'おはようございます、{name}さん' / 'Good morning, {name}'

// Summary Cards
'mypage.summary.todayTasks': '本日のタスク' / 'Today\'s Tasks'
'mypage.summary.weekTasks': '今週のタスク' / 'This Week\'s Tasks'
'mypage.summary.utilization': '稼働率' / 'Utilization'
'mypage.summary.openIssues': '未解決Issue' / 'Open Issues'

// Warnings
'mypage.warnings.title': '⚠ WARNINGポイント' / '⚠ Warning Points'
'mypage.warnings.none': '問題は検出されていません' / 'No issues detected'
'mypage.warnings.overdue': '{days}日超過（期限: {deadline}）' / '{days} days overdue (due: {deadline})'
'mypage.warnings.deadlineSoon': 'あと{days}日（期限: {deadline}）' / '{days} days left (due: {deadline})'
'mypage.warnings.deadlineToday': '本日締切' / 'Due today'
'mypage.warnings.overloaded': '今週の稼働率: {rate}%' / 'This week utilization: {rate}%'
'mypage.warnings.staleTask': '{days}日間更新なし' / 'No updates for {days} days'
'mypage.warnings.criticalIssue': 'Critical Issue — {status}' / 'Critical Issue — {status}'
'mypage.warnings.highIssue': 'High Issue — {status}' / 'High Issue — {status}'

// Sections
'mypage.todayTasks.title': '本日のタスク' / 'Today\'s Tasks'
'mypage.todayTasks.empty': '本日のタスクはありません' / 'No tasks for today'
'mypage.weekTasks.title': '今週のタスク ({start} — {end})' / 'This Week\'s Tasks ({start} — {end})'
'mypage.weekTasks.empty': '今週のタスクはありません' / 'No tasks this week'
'mypage.issues.title': '担当Issue' / 'My Issues'
'mypage.issues.empty': '未解決のIssueはありません' / 'No open issues'
'mypage.activity.title': '最近のアクティビティ' / 'Recent Activity'

// Links
'mypage.viewAllTasks': 'タスク一覧を見る' / 'View all tasks'
'mypage.viewAllIssues': 'Issue一覧を見る' / 'View all issues'

// Table columns
'mypage.col.priority': '優先度' / 'Priority'
'mypage.col.title': 'タイトル' / 'Title'
'mypage.col.progress': '進捗' / 'Progress'
'mypage.col.deadline': '締切' / 'Deadline'
'mypage.col.status': 'ステータス' / 'Status'
'mypage.col.hours': '工数' / 'Hours'
'mypage.col.severity': '重要度' / 'Severity'
'mypage.col.issueKey': 'Issue' / 'Issue'
'mypage.col.elapsed': '経過日数' / 'Elapsed'
```

---

## 10. アクセス制御

> **[A07 Security Engineer]**

| ポイント | 設計 |
|---------|------|
| ページアクセス | 全認証済みユーザー（ロール不問） |
| データ範囲 | `assigned_to = auth.uid()` に限定（RLSではなくクエリレベル） |
| 他人のMyPage | 閲覧不可（URLにユーザーID不使用） |
| API | `/api/mypage` は `auth.uid()` からのみデータ取得 |

```typescript
// /api/mypage/route.ts
export async function GET() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const data = await getMyPageData(user.id)  // user.id のみ使用、外部入力なし
  return NextResponse.json(data)
}
```

> **[A07 Security Engineer]** URLパラメータでユーザーIDを受け取らないことで、IDOR（Insecure Direct Object Reference）を根本的に防止。常に `auth.uid()` を使用。

---

## 11. APP_CONFIG 追加

```typescript
// src/lib/config.ts — alerts セクションに追加

alerts: {
  deadlineSoonDays: 3,          // 既存
  staleTaskDays: 7,             // NEW: タスク滞留の閾値（日数）
  velocityWindowDays: 7,        // 既存
  notificationRefetchMs: 60_000, // 既存
  rejectionRateWarning: 5,      // 既存
}
```

> **[A10 Compatibility Engineer]** 既存の `alerts` オブジェクトにキーを1つ追加するのみ。型は推論されるため既存のconfig参照に影響なし。

---

## 12. テスト戦略

> **[A05 QA Engineer]**

### 12.1 ユニットテスト

| テスト対象 | ファイル | ケース数 |
|-----------|---------|---------|
| WARNING生成ロジック | `tests/unit/mypage-warnings.test.ts` | 20 |
| 本日タスク抽出 | `tests/unit/mypage-today-tasks.test.ts` | 8 |
| 今週タスク抽出 | `tests/unit/mypage-week-tasks.test.ts` | 8 |
| 稼働率算出 | `tests/unit/mypage-utilization.test.ts` | 5 |

### 12.2 E2Eテスト

| # | シナリオ | ファイル |
|---|---------|---------|
| S34 | My Page 基本表示 | `tests/e2e/scenarios/S34-mypage-basic.spec.ts` |
| S35 | WARNING表示・遷移 | `tests/e2e/scenarios/S35-mypage-warnings.spec.ts` |
| S36 | タスク/Issue リンク遷移 | `tests/e2e/scenarios/S36-mypage-navigation.spec.ts` |

### 12.3 エッジケース

| ケース | 期待動作 |
|--------|---------|
| タスク0件のユーザー | 全セクション空状態表示、WARNINGなし |
| 締切未設定タスク | 締切系WARNINGに含めない、今週タスクには in_progress なら含む |
| 稼働率0%（工数未入力） | 0%表示、WARNINGなし |
| 複数WARNING同時発生 | 深刻度順ソートで全件表示 |
| 日曜深夜→月曜の週またぎ | 今週タスクが正しく切り替わる |
| タスクのマルチアサイン | `task_assignees` テーブルも考慮（assigned_to だけでなく） |

> **[A05 QA Engineer]** マルチアサインの考慮が重要。`assigned_to` は主担当だが、`task_assignees` にもエントリがある場合がある。MVP では `assigned_to` のみで実装し、Phase 2 でマルチアサイン対応を検討。

---

## 13. パフォーマンス

> **[A04 Backend Engineer]** + **[A03 Software Engineer]**

| 項目 | 対策 |
|------|------|
| 初期ロード | 1 API呼び出しで全データ取得（Promise.all で並行クエリ） |
| キャッシュ | TanStack Query staleTime: 60秒 |
| 自動更新 | 5分間隔でバックグラウンドリフェッチ |
| スケルトン | loading.tsx でセクション単位のスケルトン表示 |
| インデックス | `tasks(assigned_to)`, `issues(assigned_to)` は既存インデックスを活用 |

> **[A04 Backend Engineer]** 新規インデックスは不要。既存の `assigned_to` カラムには既にインデックスが存在（タスク一覧のフィルタで使用中）。

---

## 14. 非破壊保証チェックリスト

> **[A10 Compatibility Engineer]** 既存機能を壊さないための確認項目。

| # | チェック項目 | 確認方法 |
|---|------------|---------|
| 1 | ダッシュボードが正常に表示される | E2E: `/dashboard` のKPI・チャートが変わらず表示 |
| 2 | タスク一覧のフィルタ・ソートが正常 | E2E: 既存 S05-task-filtering.spec.ts が全パス |
| 3 | Issue一覧が正常 | E2E: Issue CRUD テストが全パス |
| 4 | サイドバーの既存リンクが正常 | E2E: 各ナビリンクの遷移確認 |
| 5 | ワークロードページが正常 | E2E: `/workload` のメンバー一覧・グラフ表示 |
| 6 | Sidebar のレスポンシブ動作 | 手動: collapsed モード、モバイルモードでMyPageリンク表示 |
| 7 | i18n既存キーに影響なし | `mypage.*` プレフィックスで名前空間分離済み |
| 8 | パフォーマンス劣化なし | Lighthouse: 既存ページのスコアが変わらない |

---

## 15. 実装スプリント計画

> **[A06 Project Manager]**

| Step | 内容 | 見積 |
|------|------|------|
| 1 | 型定義 (`types/mypage.ts`) + config追加 | 0.5h |
| 2 | データレイヤー (`lib/data/mypage.ts`) + Mock | 2h |
| 3 | API Route (`api/mypage/route.ts`) | 1h |
| 4 | Hook (`hooks/useMyPage.ts`) | 0.5h |
| 5 | コンポーネント: SummaryCards + Warnings | 2h |
| 6 | コンポーネント: TodayTasks + WeekTasks | 2h |
| 7 | コンポーネント: MyIssues + MyRecentActivity | 1.5h |
| 8 | ページ組み立て + loading.tsx | 1h |
| 9 | Sidebar ナビ追加 + i18n キー | 0.5h |
| 10 | レスポンシブ調整 + ダークモード確認 | 1h |
| 11 | ユニットテスト（WARNINGロジック） | 1.5h |
| 12 | E2Eテスト | 1.5h |
| 13 | 非破壊確認（既存E2E全パス） | 0.5h |
| **合計** | | **約15h（2日）** |

---

## 16. エージェント最終レビュー

| エージェント | 承認 | コメント |
|-------------|------|---------|
| A01 Product Owner | ✅ | ダッシュボードとの棲み分けが明確。全ロールで使える個人ビューとして価値がある |
| A02 UI/UX Engineer | ✅ | WARNINGの色分け・ソートが直感的。レスポンシブも既存パターン準拠で統一感あり |
| A03 Software Engineer | ✅ | 1 API集約 + TanStack Query で実装シンプル。既存hookとの競合なし |
| A04 Backend Engineer | ✅ | Promise.all 並行クエリで効率的。新規インデックス不要 |
| A05 QA Engineer | ✅ | マルチアサインのエッジケースを要注意。非破壊チェックリストで既存テストの回帰確認を必須とする |
| A06 Project Manager | ✅ | 2日で完了可能な現実的なスコープ。ダッシュボードへの影響ゼロ |
| A07 Security Engineer | ✅ | IDOR防止設計が適切。URLにユーザーID不使用は正しい判断 |
| A08 i18n Engineer | ✅ | `mypage.*` 名前空間で衝突なし。約50キー追加は manageable |
| A09 Data Analyst | ✅ | WARNING5カテゴリの閾値設計が実用的。0件時のポジティブ表示も良い |
| A10 Compatibility Engineer | ✅ | 既存ファイル変更3箇所のみ（Sidebar, translations, config）。すべて追加のみで既存コード改変なし |

---

## 17. 未決定事項

| # | 質問 | 担当 | 期限 |
|---|------|------|------|
| OQ-1 | ランディングページを `/mypage` にするか `/news` のままか | A01 + ユーザー | 実装前 |
| OQ-2 | マルチアサイン（`task_assignees`）の対応をMVPに含めるか | A05 + A04 | 実装前 |
| OQ-3 | 滞留タスクの閾値（7日）の妥当性 | A09 + ユーザー | テスト時 |

---

*本仕様書は10エージェントの合議により策定されました。既存機能の非破壊を最優先設計としています。*
