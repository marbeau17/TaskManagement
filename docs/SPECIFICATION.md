# WorkFlow — タスク管理ツール 仕様書

**バージョン**: v1.0
**作成日**: 2026-03-24
**ステータス**: ドラフト
**リポジトリ**: https://github.com/marbeau17/TaskManagement

---

## 1. プロジェクト概要

### 1.1 目的
デリバリー管理ワイヤーフレーム（デリバリー管理ツール.html）を基に、クリエイターチームの**タスク管理・稼働管理・納期管理**を一元化するWebアプリケーションを構築する。

### 1.2 プロダクトビジョン
- ディレクター・管理者がタスクの依頼〜アサイン〜進捗管理を効率的に行える
- クリエイターが自身のタスク進捗・工数を簡単に報告できる
- チーム全体の稼働率・納期リスクをリアルタイムに可視化できる

### 1.3 ターゲットユーザー
| ロール | 説明 | 主な操作 |
|--------|------|----------|
| 管理者（Admin） | システム全体の管理 | メンバー管理、全タスク管理、設定 |
| ディレクター（Dir） | タスクの依頼・アサイン | タスク依頼、アサイン、進捗確認、コメント |
| 依頼者（Requester） | タスクの依頼のみ | タスク依頼、進捗閲覧 |
| クリエイター（Creator） | タスクの実行 | 進捗更新、工数入力、コメント |

---

## 2. システムアーキテクチャ

### 2.1 全体構成

```
┌─────────────────────────────────────────────────────┐
│                    Vercel (Hosting)                  │
│  ┌───────────────────────────────────────────────┐  │
│  │          Next.js 14+ (App Router / SPA)       │  │
│  │  ┌─────────┐ ┌──────────┐ ┌───────────────┐  │  │
│  │  │ React   │ │ Tailwind │ │ Zustand/      │  │  │
│  │  │ 18+     │ │ CSS v4   │ │ TanStack Query│  │  │
│  │  └─────────┘ └──────────┘ └───────────────┘  │  │
│  └───────────────────────────────────────────────┘  │
│                         │                           │
│  ┌───────────────────────────────────────────────┐  │
│  │        Vercel Serverless Functions (API)      │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│   Supabase   │ │   Supabase   │ │   Supabase   │
│  PostgreSQL  │ │     Auth     │ │   Storage    │
│   (DB)       │ │   (認証)     │ │ (ファイル)   │
└──────────────┘ └──────────────┘ └──────────────┘
```

### 2.2 技術スタック

| レイヤー | 技術 | 理由 |
|----------|------|------|
| フロントエンド | Next.js 14+ (App Router) | SPA対応、Vercel最適化 |
| UIライブラリ | React 18+ | コンポーネント指向開発 |
| スタイリング | Tailwind CSS v4 | ワイヤーフレームのデザインシステムを再現 |
| UIコンポーネント | shadcn/ui | 高品質なベースコンポーネント |
| 状態管理 | Zustand | 軽量・シンプル |
| データフェッチ | TanStack Query v5 | キャッシュ・リアルタイム同期 |
| バックエンド | Supabase | PostgreSQL + Auth + Storage + Realtime |
| 認証 | Supabase Auth | メール/パスワード + OAuth |
| ファイルストレージ | Supabase Storage | 添付ファイル管理 |
| リアルタイム | Supabase Realtime | コメント・ステータス即時反映 |
| ホスティング | Vercel | 自動デプロイ・プレビュー環境 |
| CI/CD | GitHub Actions + Vercel | 自動テスト・自動デプロイ |
| テスト | Vitest + Playwright | ユニット + E2Eテスト |
| フォーム管理 | React Hook Form + Zod | バリデーション |
| 日付処理 | date-fns | 軽量な日付ライブラリ |
| チャート | Recharts | KPIダッシュボード用 |

### 2.3 ディレクトリ構成

```
TaskManagement/
├── .github/
│   └── workflows/
│       ├── ci.yml              # テスト・Lint
│       ├── preview.yml         # PRプレビューデプロイ
│       └── production.yml      # 本番デプロイ
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── layout.tsx
│   │   ├── page.tsx            # → /dashboard にリダイレクト
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   └── signup/page.tsx
│   │   ├── (main)/
│   │   │   ├── layout.tsx      # サイドバー + トップバー共通レイアウト
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── tasks/
│   │   │   │   ├── page.tsx         # タスク一覧
│   │   │   │   ├── new/page.tsx     # タスク依頼（Step1 + Step2）
│   │   │   │   └── [id]/page.tsx    # タスク詳細
│   │   │   ├── workload/page.tsx    # 稼働管理
│   │   │   ├── members/page.tsx     # メンバー管理
│   │   │   └── settings/page.tsx    # 設定
│   │   └── api/                     # API Routes (必要に応じて)
│   ├── components/
│   │   ├── ui/                 # shadcn/ui ベースコンポーネント
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Topbar.tsx
│   │   │   └── Shell.tsx
│   │   ├── dashboard/
│   │   │   ├── KpiCards.tsx
│   │   │   ├── CreatorWorkload.tsx
│   │   │   ├── DeadlineAlerts.tsx
│   │   │   ├── UnassignedTasks.tsx
│   │   │   └── ClientView.tsx
│   │   ├── tasks/
│   │   │   ├── TaskTable.tsx
│   │   │   ├── TaskFilters.tsx
│   │   │   ├── TaskForm.tsx
│   │   │   ├── AssignForm.tsx
│   │   │   ├── TaskDetail.tsx
│   │   │   ├── ProgressInput.tsx
│   │   │   ├── CommentSection.tsx
│   │   │   └── AttachmentList.tsx
│   │   ├── workload/
│   │   │   ├── WorkloadKpi.tsx
│   │   │   └── MemberWorkloadTable.tsx
│   │   └── shared/
│   │       ├── StatusChip.tsx
│   │       ├── RoleChip.tsx
│   │       ├── Avatar.tsx
│   │       ├── ProgressBar.tsx
│   │       └── StepIndicator.tsx
│   ├── hooks/
│   │   ├── useTasks.ts
│   │   ├── useMembers.ts
│   │   ├── useWorkload.ts
│   │   ├── useAuth.ts
│   │   └── useRealtime.ts
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts        # ブラウザ用クライアント
│   │   │   ├── server.ts        # サーバー用クライアント
│   │   │   └── admin.ts         # サービスロール用
│   │   ├── utils.ts
│   │   └── constants.ts
│   ├── stores/
│   │   ├── uiStore.ts
│   │   └── filterStore.ts
│   └── types/
│       ├── database.ts          # Supabase型定義（自動生成）
│       ├── task.ts
│       ├── member.ts
│       └── workload.ts
├── supabase/
│   ├── migrations/              # DBマイグレーション
│   │   ├── 001_create_users.sql
│   │   ├── 002_create_clients.sql
│   │   ├── 003_create_tasks.sql
│   │   ├── 004_create_comments.sql
│   │   ├── 005_create_attachments.sql
│   │   ├── 006_create_activity_logs.sql
│   │   └── 007_create_rls_policies.sql
│   ├── seed.sql                 # 初期データ
│   └── config.toml
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── docs/
│   └── SPECIFICATION.md         # 本ドキュメント
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── vercel.json
```

---

## 3. データベース設計

### 3.1 ER図

```
users ──┐
        ├── tasks ──── comments
clients ┘    │
             ├── attachments
             └── activity_logs
```

### 3.2 テーブル定義

#### `users` — ユーザー
| カラム | 型 | 制約 | 説明 |
|--------|------|------|------|
| id | uuid | PK, default gen_random_uuid() | Supabase Auth連携 |
| email | text | NOT NULL, UNIQUE | メールアドレス |
| name | text | NOT NULL | 表示名 |
| name_short | text | | 1文字略称（アバター表示用） |
| role | enum | NOT NULL | `admin`, `director`, `requester`, `creator` |
| avatar_color | text | | アバター色クラス（av-a〜av-e） |
| weekly_capacity_hours | numeric(4,1) | DEFAULT 16.0 | 週あたりキャパシティ（時間） |
| is_active | boolean | DEFAULT true | アクティブフラグ |
| created_at | timestamptz | DEFAULT now() | |
| updated_at | timestamptz | DEFAULT now() | |

#### `clients` — クライアント
| カラム | 型 | 制約 | 説明 |
|--------|------|------|------|
| id | uuid | PK | |
| name | text | NOT NULL, UNIQUE | クライアント名 |
| created_at | timestamptz | DEFAULT now() | |

#### `tasks` — タスク
| カラム | 型 | 制約 | 説明 |
|--------|------|------|------|
| id | uuid | PK | |
| client_id | uuid | FK → clients.id, NOT NULL | クライアント |
| title | text | NOT NULL | タスク名 |
| description | text | | 依頼内容・詳細 |
| status | enum | NOT NULL, DEFAULT 'waiting' | `waiting`（アサイン待ち）, `todo`（未着手）, `in_progress`（進行中）, `done`（完了）, `rejected`（差し戻し） |
| progress | integer | DEFAULT 0, CHECK 0-100 | 進捗率（%） |
| requested_by | uuid | FK → users.id, NOT NULL | 依頼者 |
| assigned_to | uuid | FK → users.id | 担当クリエイター |
| director_id | uuid | FK → users.id | 担当ディレクター |
| desired_deadline | date | | 希望納期（依頼者入力） |
| confirmed_deadline | date | | 確定納期（管理者/Dir設定） |
| estimated_hours | numeric(5,1) | | 見積工数（時間） |
| actual_hours | numeric(5,1) | DEFAULT 0 | 実績工数（時間） |
| reference_url | text | | 参考URL |
| is_draft | boolean | DEFAULT false | 下書きフラグ |
| created_at | timestamptz | DEFAULT now() | |
| updated_at | timestamptz | DEFAULT now() | |

#### `comments` — コメント
| カラム | 型 | 制約 | 説明 |
|--------|------|------|------|
| id | uuid | PK | |
| task_id | uuid | FK → tasks.id, NOT NULL | 対象タスク |
| user_id | uuid | FK → users.id, NOT NULL | 投稿者 |
| body | text | NOT NULL | コメント本文 |
| created_at | timestamptz | DEFAULT now() | |

#### `attachments` — 添付ファイル
| カラム | 型 | 制約 | 説明 |
|--------|------|------|------|
| id | uuid | PK | |
| task_id | uuid | FK → tasks.id, NOT NULL | 対象タスク |
| uploaded_by | uuid | FK → users.id, NOT NULL | アップロード者 |
| file_name | text | NOT NULL | ファイル名 |
| file_size | bigint | | ファイルサイズ（bytes） |
| storage_path | text | NOT NULL | Supabase Storage パス |
| mime_type | text | | MIMEタイプ |
| created_at | timestamptz | DEFAULT now() | |

#### `activity_logs` — 更新履歴
| カラム | 型 | 制約 | 説明 |
|--------|------|------|------|
| id | uuid | PK | |
| task_id | uuid | FK → tasks.id, NOT NULL | 対象タスク |
| user_id | uuid | FK → users.id, NOT NULL | 操作者 |
| action | text | NOT NULL | 操作種別（`created`, `assigned`, `progress_updated`, `status_changed`, `hours_updated`, `comment_added`, `deadline_changed`, `rejected`） |
| detail | jsonb | | 変更内容の詳細（old/new値等） |
| created_at | timestamptz | DEFAULT now() | |

### 3.3 Row Level Security (RLS)

| テーブル | ポリシー |
|----------|----------|
| users | 全認証ユーザーがREAD可、自身のレコードのみUPDATE可、adminのみINSERT/DELETE可 |
| clients | 全認証ユーザーがREAD可、admin/directorのみCRUD可 |
| tasks | 全認証ユーザーがREAD可、依頼者/admin/directorがINSERT可、assigned_toのユーザーがprogress/actual_hours/statusをUPDATE可、admin/directorが全フィールドUPDATE可 |
| comments | 全認証ユーザーがREAD可、認証ユーザーがINSERT可、投稿者のみDELETE可 |
| attachments | 全認証ユーザーがREAD可、認証ユーザーがINSERT可、アップロード者/admin/directorのみDELETE可 |
| activity_logs | 全認証ユーザーがREAD可、システムのみINSERT可（トリガー経由） |

### 3.4 DBトリガー・関数

| トリガー | 説明 |
|----------|------|
| `on_task_update` | tasksテーブルのUPDATE時にactivity_logsへ自動記録 |
| `on_task_insert` | tasksテーブルのINSERT時にactivity_logsへ`created`を記録 |
| `update_timestamp` | updated_atを自動更新 |
| `calc_workload_view` | ビュー：ユーザーごとの週次稼働率を計算 |

---

## 4. 画面仕様

### 4.1 認証画面

#### ログイン画面 (`/login`)
- メールアドレス + パスワードによるログイン
- 「パスワードを忘れた」リンク
- 新規登録は管理者による招待制（自己登録なし）

### 4.2 ダッシュボード (`/dashboard`)

#### KPIカード（4枚横並び）
| KPI | データソース | 表示例 |
|-----|-------------|--------|
| 今週のタスク数 | tasks WHERE 確定納期が今週 | 14件、先週比 +3件 |
| アサイン待ち | tasks WHERE status = 'waiting' | 2件、⚠ 要対応 |
| 今週の完了率 | done / total | 64%、9/14件 |
| 納期超過 | tasks WHERE 確定納期 < 今日 AND status != 'done' | 1件、即時対応が必要 |

#### タブ切替
- **クリエイター別ビュー**（デフォルト）
  - 左: クリエイター稼働状況テーブル（担当者、稼働バー、%、実績/見積、状態）
  - 右上: 納期アラート（危険→警告→注意→余裕の順）
  - 右下: アサイン待ちタスク一覧 + アサインへのリンク
- **クライアント別ビュー**
  - クライアントカード（タスク数、進行状況、進捗バー、メンバー）
  - クライアント別タスクテーブル

#### 期間切替
- 今週 / 先週 / 今月 / 先月

#### 通知ボタン
- 未読件数のドット表示
- 通知一覧ドロップダウン（将来拡張）

### 4.3 タスク依頼 (`/tasks/new`)

#### Step 1 — 依頼情報の入力
- ステップインジケーター（Step 1 → Step 2）
- フォーム項目:
  - クライアント名（必須）— オートコンプリート付き
  - タスク名（必須）
  - 依頼内容・詳細（テキストエリア）
  - 希望納期（日付ピッカー、任意）
  - 参考URL / 備考
- アクション:
  - 「下書き保存」ボタン（トップバー）
  - 「キャンセル」→ 一覧に戻る
  - 「依頼を登録してアサインを依頼 →」→ Step 2へ

#### Step 2 — アサイン設定（管理者/ディレクターのみ）
- 依頼情報のサマリー表示（編集可）
- アサイン設定フォーム:
  - 担当クリエイター（必須）— セレクトボックス、稼働率表示
  - 依頼者（ディレクター）— 自動入力
  - **稼働プレビュー**: 選択したクリエイターの稼働率変化を視覚的に表示、超過時は警告
  - 確定納期（必須）— 希望納期との差分表示
  - 見積工数（必須）— 0.5h単位
- アクション:
  - 「← 前へ」→ Step 1へ
  - 「後で設定する」→ status=waiting で保存
  - 「アサインしてクリエイターに通知」→ status=todo で保存、通知送信

### 4.4 タスク一覧 (`/tasks`)

#### フィルター・検索
- テキスト検索（タスク名・クライアント名）
- クライアント絞り込み（セレクト）
- 担当者絞り込み（セレクト）
- 依頼者絞り込み（セレクト）

#### ステータスタブ
- すべて / アサイン待ち / 未着手 / 進行中 / 完了（各件数表示）

#### テーブル
| カラム | 説明 |
|--------|------|
| クライアント | クライアント名 |
| タスク名 | タイトル + 詳細抜粋 |
| 担当クリエイター | アバター + 名前、未アサインは「未アサイン」表示 |
| 進捗 | %表示 + プログレスバー |
| 確定納期 | 超過は赤字 + アイコン |
| 見積 | 時間 |
| 実績 | 時間（手入力済みマーク付き） |
| ステータス | ステータスチップ |

#### 期間切替
- 今週 / 今月 / 全期間

#### アクション
- CSV出力ボタン
- タスク依頼ボタン

### 4.5 タスク詳細 (`/tasks/[id]`)

#### トップバー
- 一覧に戻るボタン
- タスク名
- ステータスチップ
- ロール表示（現在の閲覧ロール）
- 差し戻しボタン（admin/director）
- 完了ボタン

#### 左カラム

**依頼情報カード**
- クライアント名、タスク名、依頼内容・詳細
- 希望納期、確定納期

**進捗・工数入力カード**（クリエイター編集可）
- 進捗率スライダー（0〜100%、25%刻みのクイックボタン付き）
- ステータス変更（ラジオボタン: 未着手 / 進行中 / 完了）
- 実績工数入力（数値入力、見積との比較バー表示）
- 「更新する」ボタン

**コメントカード**
- コメント一覧（アバター、名前、日時、本文）
- 自分のコメントはハイライト
- 新規コメント入力（@メンション対応）
- リアルタイム更新（Supabase Realtime）

#### 右カラム

**アサイン情報カード**（admin/director表示）
- 担当者情報（アバター、名前、ロール、今週稼働率）
- 見積/実績工数の比較
- 希望納期/確定納期
- 「アサイン変更」ボタン

**更新履歴カード**
- activity_logsからの時系列表示

**添付ファイルカード**
- ファイル一覧（アイコン、ファイル名、サイズ）
- ファイル添付ボタン
- ダウンロードリンク

### 4.6 稼働管理 (`/workload`)

#### KPIカード（4枚）
| KPI | 説明 |
|-----|------|
| チーム平均稼働率 | 全クリエイターの平均、先週比 |
| 今週 実績工数合計 | 全タスクのactual_hours合計 / 見積合計 |
| タスク完了率 | done / total |
| 稼働超過メンバー | 稼働率100%超のクリエイター数 |

#### メンバー別稼働サマリーテーブル
| カラム | 説明 |
|--------|------|
| 担当者 | アバター + 名前 |
| 稼働バー | ビジュアルバー |
| 稼働率 | %（色分け: 緑=余裕、黄=警告、赤=超過） |
| 実績 / 見積 | 時間 |
| タスク | 担当タスク数 |
| 完了 | 完了タスク数 |
| 状態 | ステータスチップ（通常/警告/超過/余裕） |

#### 期間切替
- 今週 / 先週 / 今月 / 先月

### 4.7 メンバー管理 (`/members`)（ワイヤーフレーム拡張）
- メンバー一覧テーブル
- メンバー追加（招待メール送信）
- ロール変更
- 週キャパシティ設定
- アクティブ/非アクティブ切替

### 4.8 設定 (`/settings`)（ワイヤーフレーム拡張）
- 組織名・ロゴ設定
- 通知設定
- 稼働率しきい値設定（警告: 80%、超過: 100%など）

---

## 5. デザインシステム

### 5.1 カラーパレット（ワイヤーフレーム準拠）

```
Primary (Mint):
  --mint:      #6FB5A3
  --mint-l:    #A8D5CA
  --mint-ll:   #E2F2EE
  --mint-d:    #4A9482
  --mint-dd:   #2E6B5A

Background:
  --bg:        #F0F4F3
  --surface:   #FAFCFB
  --surf2:     #EEF3F1
  --surf3:     #E4EDEA

Text:
  --text:      #2A3A36
  --text2:     #647870
  --text3:     #9DAFAA

Status Colors:
  Warning:  bg=#FBF5E6, text=#7A5E18, border=#D8C070
  Danger:   bg=#FAE8E8, text=#7A3030, border=#D08888
  OK/Done:  bg=#E4F4EC, text=#1E6040, border=#7ABEA0
  Info/WIP: bg=#E6EFF8, text=#1E4A7A, border=#7AAAD8
```

### 5.2 タイポグラフィ
- フォント: `Yu Gothic`, `YuGothic`, `Noto Sans JP`, sans-serif
- ベースサイズ: 13px
- 行間: 1.6

### 5.3 コンポーネント一覧

| コンポーネント | 説明 | バリエーション |
|---------------|------|---------------|
| StatusChip | ステータス表示 | waiting, todo, in_progress, done, rejected |
| RoleChip | ロール表示 | admin, director, requester, creator |
| Avatar | ユーザーアバター | sm(24px), md(30px), lg(38px) × 5色 |
| ProgressBar | 進捗バー | low, mid, high, full |
| KpiCard | KPI表示カード | mint, warning, danger, info, purple |
| Button | ボタン | mint, ghost, danger, sm |
| Card | 汎用カード | ヘッダー付き/なし |
| StepIndicator | ステップ表示 | done, active, pending |
| FilterBar | フィルター | 検索 + セレクト群 |
| TabBar | タブ切替 | カウントバッジ付き |

---

## 6. 認証・認可

### 6.1 認証方式
- Supabase Auth（メール/パスワード）
- セッション管理: JWTベース
- 招待制: 管理者がユーザーを追加 → 招待メール送信

### 6.2 ロール別権限マトリクス

| 操作 | Admin | Director | Requester | Creator |
|------|:-----:|:--------:|:---------:|:-------:|
| ダッシュボード閲覧 | ○ | ○ | △（限定） | △（自分のみ） |
| タスク依頼 | ○ | ○ | ○ | × |
| アサイン設定 | ○ | ○ | × | × |
| タスク一覧（全件） | ○ | ○ | △（自分の依頼） | △（自分の担当） |
| タスク詳細閲覧 | ○ | ○ | ○（自分の依頼） | ○（自分の担当） |
| 進捗・工数更新 | ○ | × | × | ○（自分の担当） |
| コメント投稿 | ○ | ○ | ○ | ○ |
| 差し戻し | ○ | ○ | × | × |
| 完了承認 | ○ | ○ | × | × |
| 稼働管理閲覧 | ○ | ○ | × | △（自分のみ） |
| メンバー管理 | ○ | × | × | × |
| 設定変更 | ○ | × | × | × |

---

## 7. API設計

### 7.1 API一覧（Supabase Client SDK経由）

主にSupabase Client SDKのCRUD操作 + RLSで制御。カスタムロジックはSupabase Edge FunctionsまたはNext.js API Routesで実装。

| エンドポイント/操作 | メソッド | 説明 |
|---------------------|----------|------|
| `supabase.from('tasks').select()` | GET | タスク一覧取得（RLSでフィルタ） |
| `supabase.from('tasks').insert()` | POST | タスク作成 |
| `supabase.from('tasks').update()` | PATCH | タスク更新 |
| `/api/tasks/[id]/assign` | POST | アサイン（稼働チェック含む） |
| `/api/tasks/[id]/complete` | POST | 完了処理 |
| `/api/tasks/[id]/reject` | POST | 差し戻し処理 |
| `/api/tasks/export` | GET | CSV出力 |
| `/api/workload/summary` | GET | 稼働サマリー計算 |
| `/api/members/invite` | POST | メンバー招待 |

### 7.2 リアルタイムサブスクリプション

```typescript
// コメントのリアルタイム購読
supabase
  .channel('task-comments')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'comments',
    filter: `task_id=eq.${taskId}`
  }, (payload) => { /* 新コメント追加 */ })
  .subscribe()

// タスクステータスのリアルタイム購読
supabase
  .channel('task-updates')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'tasks'
  }, (payload) => { /* タスク更新反映 */ })
  .subscribe()
```

---

## 8. CI/CD パイプライン

### 8.1 GitHub Actions ワークフロー

#### `ci.yml` — プルリクエスト時
```
トリガー: pull_request → main
ジョブ:
  1. lint        — ESLint + Prettier チェック
  2. typecheck   — TypeScript 型チェック
  3. test-unit   — Vitest ユニットテスト
  4. test-e2e    — Playwright E2Eテスト
  5. build       — Next.js ビルド確認
```

#### `preview.yml` — プレビューデプロイ
```
トリガー: pull_request → main (ciジョブ成功後)
ジョブ:
  1. Vercel Preview Deploy
  2. PRコメントにプレビューURLを投稿
```

#### `production.yml` — 本番デプロイ
```
トリガー: push → main
ジョブ:
  1. ci（テスト全パス確認）
  2. Vercel Production Deploy
  3. Supabase Migration（変更がある場合）
```

### 8.2 ブランチ戦略

```
main           ← 本番環境
  └── develop  ← 開発統合ブランチ
       ├── feature/xxx  ← 機能開発
       ├── fix/xxx      ← バグ修正
       └── chore/xxx    ← 設定・メンテ
```

- feature → develop: PRレビュー必須（1名以上承認）
- develop → main: リリースPR（全テスト通過必須）

---

## 9. 通知設計（将来拡張）

| イベント | 通知先 | 方法 |
|----------|--------|------|
| タスク依頼登録 | admin, director | アプリ内通知 |
| アサイン通知 | creator | アプリ内通知 + メール |
| コメント追加 | タスク関係者 | アプリ内通知 |
| 納期2日前 | creator, director | アプリ内通知 |
| 納期超過 | creator, director, admin | アプリ内通知 + メール |
| 稼働超過 | admin, director | アプリ内通知 |

---

## 10. 非機能要件

| 項目 | 要件 |
|------|------|
| パフォーマンス | 初回ロード 3秒以内（LCP）、画面遷移 500ms以内 |
| レスポンシブ | デスクトップ優先、タブレット対応（768px〜） |
| ブラウザ対応 | Chrome, Safari, Edge 最新2バージョン |
| アクセシビリティ | WCAG 2.1 AA準拠（キーボード操作、スクリーンリーダー基本対応） |
| セキュリティ | RLSによるデータアクセス制御、XSS対策、CSRF対策 |
| 可用性 | Vercel + Supabaseのマネージドインフラに依存（99.9%+） |
| データバックアップ | Supabaseの自動バックアップ（日次） |
| 国際化 | 日本語のみ（初期リリース） |

---

## 11. 開発チーム体制（15名）

### 11.1 チーム構成

| # | ロール | 人数 | 主な責務 |
|---|--------|------|----------|
| 1 | プロジェクトマネージャー（PM） | 1 | スケジュール管理、ステークホルダー調整、進捗報告 |
| 2 | ソフトウェア開発マネージャー（SDM） | 1 | 技術方針決定、コードレビュー統括、品質管理 |
| 3 | UI/UXエンジニア | 2 | デザインシステム構築、コンポーネント設計、UXリサーチ |
| 4 | フロントエンド（Web開発）エンジニア | 4 | ページ実装、状態管理、API連携、テスト |
| 5 | Supabaseエンジニア | 2 | DB設計、マイグレーション、RLS、Edge Functions |
| 6 | バックエンドエンジニア | 3 | API Routes実装、ビジネスロジック、CI/CD |
| 7 | QAエンジニア | 2 | テスト設計、E2Eテスト実装、品質保証 |

### 11.2 担当領域マッピング

```
PM ─────────────────── スケジュール、タスク管理（本ツール自体で管理）
SDM ────────────────── アーキテクチャレビュー、PR承認、技術判断

UI/UX #1 ──────────── デザインシステム、shadcn/ui カスタマイズ、共有コンポーネント
UI/UX #2 ──────────── 各画面のレイアウト、レスポンシブ対応、アニメーション

Web開発 #1 ────────── ダッシュボード画面
Web開発 #2 ────────── タスク依頼（Step1+2）、タスク一覧
Web開発 #3 ────────── タスク詳細（進捗入力、コメント、添付）
Web開発 #4 ────────── 稼働管理、メンバー管理、設定画面

Supabase #1 ───────── DB設計、マイグレーション、RLSポリシー
Supabase #2 ───────── Realtime設定、Storage設定、Edge Functions

Backend #1 ─────────── 認証フロー、ミドルウェア、セッション管理
Backend #2 ─────────── API Routes（タスクCRUD、アサイン、CSV出力）
Backend #3 ─────────── CI/CD構築、Vercel設定、GitHub Actions

QA #1 ──────────────── テスト設計、ユニットテスト
QA #2 ──────────────── E2Eテスト、パフォーマンステスト
```

### 11.3 開発フェーズ

| フェーズ | 内容 | 期間目安 |
|----------|------|----------|
| Phase 0 | 環境構築・CI/CD基盤 | Week 1 |
| Phase 1 | DB設計 + 認証 + 共通コンポーネント | Week 2-3 |
| Phase 2 | ダッシュボード + タスク一覧 | Week 3-4 |
| Phase 3 | タスク依頼 + タスク詳細 | Week 4-5 |
| Phase 4 | 稼働管理 + メンバー管理 | Week 5-6 |
| Phase 5 | リアルタイム + 通知 | Week 6-7 |
| Phase 6 | E2Eテスト + バグ修正 + 最適化 | Week 7-8 |
| Phase 7 | UAT + 本番リリース | Week 8 |

---

## 12. マイルストーン

| マイルストーン | 完了条件 |
|---------------|----------|
| M1: 基盤完成 | リポジトリ、CI/CD、DB、認証が動作 |
| M2: MVP | ダッシュボード + タスクCRUDが動作 |
| M3: 機能完成 | 全画面実装完了、リアルタイム動作 |
| M4: リリース | E2E全パス、パフォーマンス基準クリア |

---

## 13. リスクと対策

| リスク | 影響 | 対策 |
|--------|------|------|
| Supabase Realtimeの遅延 | UX劣化 | ポーリングへのフォールバック |
| 稼働率計算の複雑化 | パフォーマンス | DBビュー + キャッシュ |
| ファイルアップロードの容量 | ストレージコスト | アップロード上限設定（10MB/ファイル） |
| RLSポリシーの不備 | セキュリティ | E2Eテストでロール別アクセスを検証 |

---

## 付録A: 環境変数

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx

# Vercel
VERCEL_URL=xxx

# App
NEXT_PUBLIC_APP_NAME=WorkFlow
```

## 付録B: ワイヤーフレームとの対応表

| ワイヤーフレーム画面 | 実装パス | 備考 |
|---------------------|----------|------|
| ダッシュボード (s-dashboard) | `/dashboard` | クリエイター別/クライアント別ビュー |
| タスク依頼 Step1 (s-tasknew1) | `/tasks/new` (Step 1) | ウィザード形式 |
| タスク依頼 Step2 (s-tasknew2) | `/tasks/new` (Step 2) | 稼働プレビュー含む |
| タスク一覧 (s-tasklist) | `/tasks` | フィルタ・タブ・テーブル |
| タスク詳細 (s-taskdetail) | `/tasks/[id]` | 2カラムレイアウト |
| 稼働管理 (s-workload) | `/workload` | KPI + メンバーテーブル |
| メンバー (未実装) | `/members` | 新規追加 |
| 設定 (未実装) | `/settings` | 新規追加 |
