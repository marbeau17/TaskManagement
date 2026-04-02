# CRM機能 仕様書 — WorkFlow タスク管理ツール

**バージョン**: v1.0
**作成日**: 2026-04-02
**ステータス**: ドラフト
**レビュー方式**: 15エージェント合議制

---

## 0. エージェントレビューボード

本仕様書は以下15名のエージェント視点で策定。各セクションに担当エージェントのレビューコメントを付記する。

| # | エージェント | 担当領域 |
|---|-------------|----------|
| A01 | **CRM Manager** | ビジネスロジック・ファネル設計・KPI定義 |
| A02 | **Sales Manager** | 営業プロセス・商談管理・売上予測 |
| A03 | **Project Manager** | スケジュール・マイルストーン・既存機能連携 |
| A04 | **UI/UX Engineer** | 画面設計・インタラクション・レスポンシブ |
| A05 | **Software Engineer (Frontend)** | React/Next.js実装・状態管理・パフォーマンス |
| A06 | **Backend Engineer** | DB設計・API設計・RLS・パフォーマンス |
| A07 | **Compatibility Engineer** | 外部連携・CSV/HubSpotインポート・データマッピング |
| A08 | **Data Analyst** | レポート・ダッシュボード・ファネル分析 |
| A09 | **QA Engineer** | テスト戦略・E2Eシナリオ・エッジケース |
| A10 | **Security Engineer** | RLS・アクセス制御・個人情報保護 |
| A11 | **i18n Engineer** | 多言語対応・翻訳キー設計 |
| A12 | **DevOps Engineer** | マイグレーション戦略・CI/CD・モニタリング |
| A13 | **Product Owner** | 優先度・MVP定義・ロードマップ |
| A14 | **Customer Success Manager** | ユーザーオンボーディング・ヘルプ・フィードバックループ |
| A15 | **Integration Architect** | 既存Pipeline/Task/Projectとの統合設計 |

---

## 1. 概要

### 1.1 目的

既存のWorkFlowタスク管理ツールにCRM（Customer Relationship Management）機能を追加し、**リードジェネレーション → ナーチャリング → ディールクローズ**の営業パイプライン全体を一元管理する。

> **[A01 CRM Manager]** 現在のPipeline機能は案件の売上予測に特化しているが、CRMはその上流工程（リード獲得・育成）から下流（受注後のプロジェクト連携）までをカバーする。Pipelineとは補完関係になる。

> **[A13 Product Owner]** MVP（Phase 1）ではコンタクト管理・リード管理・ディール管理の3コアに集中し、マーケティングオートメーションは Phase 2 以降とする。

### 1.2 スコープ

| フェーズ | 機能 | 目標 |
|---------|------|------|
| **Phase 1 (MVP)** | コンタクト・企業・リード・ディール・アクティビティ・CSV/HubSpotインポート | 営業プロセスの基本管理 |
| **Phase 2** | メール連携・ナーチャリングワークフロー・スコアリング | 自動化・効率化 |
| **Phase 3** | レポート高度化・AI予測・マーケティング連携 | データドリブン営業 |

### 1.3 ターゲットユーザー

| ロール | CRMでの操作 |
|--------|-------------|
| Admin | 全CRMデータの管理、インポート/エクスポート設定 |
| Director | ディール承認、パイプラインレビュー、KPI確認 |
| Sales (新ロール候補) | リード登録、ナーチャリング、ディール管理 |
| Creator | CRM閲覧（関連タスクの参照のみ） |
| Requester | アクセス不可 |

> **[A10 Security Engineer]** CRMデータは顧客個人情報を含むため、RLS ポリシーを厳格に設計。`sales` ロールの追加を推奨。ロールは既存の `UserRole` の string union 拡張で対応可能。

---

## 2. 情報アーキテクチャ

### 2.1 エンティティ関係図

```
┌──────────────┐       ┌──────────────┐
│  crm_companies│◄──────│ crm_contacts │
│  (企業)       │ 1:N   │ (コンタクト)  │
└──────┬───────┘       └──────┬───────┘
       │                      │
       │ 1:N                  │ 1:N
       ▼                      ▼
┌──────────────┐       ┌──────────────┐
│  crm_deals   │◄──────│crm_activities│
│  (ディール)   │ 1:N   │(アクティビティ)│
└──────┬───────┘       └──────────────┘
       │                      ▲
       │ 1:N                  │ polymorphic
       ▼                      │
┌──────────────┐       ┌──────────────┐
│crm_deal_items│       │  crm_leads   │
│(ディール明細) │       │  (リード)     │
└──────────────┘       └──────┬───────┘
                              │
                              │ converts to
                              ▼
                       ┌──────────────┐
                       │  crm_deals   │
                       └──────────────┘

連携:
  crm_companies ──── clients (既存テーブル参照)
  crm_deals ──── pipeline_opportunities (任意リンク)
  crm_deals ──── projects (受注後プロジェクト連携)
  crm_contacts ──── users (社内担当者)
```

> **[A15 Integration Architect]** 既存の `clients` テーブルとの二重管理を避けるため、`crm_companies.client_id` で既存クライアントをオプショナルに紐付ける。新規の場合はCRM側で作成し、受注確定時にクライアントテーブルへ同期する。

> **[A06 Backend Engineer]** Polymorphic activity は `entity_type` + `entity_id` パターンで実装。既存の `activity_logs` テーブルとは分離し、CRM専用のアクティビティ履歴とする。

### 2.2 ファネルステージ定義

```
┌─────────┐    ┌──────────┐    ┌───────────┐    ┌──────────┐    ┌─────────┐    ┌────────┐
│  New     │───▶│ Contacted│───▶│ Qualified │───▶│ Proposal │───▶│Negotiation│──▶│ Won/Lost│
│  (新規)  │    │(初回接触) │    │(見込確認)  │    │(提案中)   │    │(交渉中)   │   │(成約/失注)│
└─────────┘    └──────────┘    └───────────┘    └──────────┘    └──────────┘    └────────┘
     Lead Phase                    │                    Deal Phase
     ◄─────────────────────────────┼────────────────────────────────────────────►
                              Conversion Point
```

> **[A01 CRM Manager]** ステージは設定画面からカスタマイズ可能にする。デフォルトは上記6+2ステージ。各ステージに滞在日数の警告閾値を設定できるようにする。

> **[A02 Sales Manager]** Qualified → Proposal の転換がキーポイント。ここでの滞在時間が長い案件を自動でハイライトしたい。

---

## 3. データベース設計

> **[A06 Backend Engineer]** マイグレーション番号は `028_create_crm.sql`。既存テーブルとの外部キーは `ON DELETE SET NULL` で安全に参照。

### 3.1 crm_companies（企業）

```sql
CREATE TABLE IF NOT EXISTS crm_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,  -- 既存クライアント紐付け
  name TEXT NOT NULL,
  domain TEXT,                          -- 企業ドメイン（重複検出用）
  industry TEXT DEFAULT '',             -- 業種
  company_size TEXT DEFAULT '' CHECK (company_size IN (
    '', 'solo', '1-10', '11-50', '51-200', '201-1000', '1001+'
  )),
  phone TEXT DEFAULT '',
  website TEXT DEFAULT '',
  address TEXT DEFAULT '',
  description TEXT DEFAULT '',
  owner_id UUID REFERENCES users(id) ON DELETE SET NULL,   -- 担当営業
  source TEXT DEFAULT '' CHECK (source IN (
    '', 'inbound', 'outbound', 'referral', 'event', 'website', 'social', 'other'
  )),
  tags JSONB DEFAULT '[]'::jsonb,       -- 自由タグ
  custom_fields JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_crm_companies_domain
  ON crm_companies(domain) WHERE domain IS NOT NULL AND domain != '';
CREATE INDEX IF NOT EXISTS idx_crm_companies_owner ON crm_companies(owner_id);
CREATE INDEX IF NOT EXISTS idx_crm_companies_client ON crm_companies(client_id);
```

### 3.2 crm_contacts（コンタクト）

```sql
CREATE TABLE IF NOT EXISTS crm_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES crm_companies(id) ON DELETE SET NULL,
  first_name TEXT NOT NULL DEFAULT '',
  last_name TEXT NOT NULL DEFAULT '',
  email TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  title TEXT DEFAULT '',                -- 役職
  department TEXT DEFAULT '',
  linkedin_url TEXT DEFAULT '',
  description TEXT DEFAULT '',
  owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
  lifecycle_stage TEXT DEFAULT 'subscriber' CHECK (lifecycle_stage IN (
    'subscriber', 'lead', 'mql', 'sql', 'opportunity', 'customer', 'evangelist', 'other'
  )),
  lead_status TEXT DEFAULT 'new' CHECK (lead_status IN (
    'new', 'contacted', 'qualified', 'unqualified'
  )),
  lead_score INTEGER DEFAULT 0 CHECK (lead_score BETWEEN 0 AND 100),
  source TEXT DEFAULT '',
  last_contacted_at TIMESTAMPTZ,
  tags JSONB DEFAULT '[]'::jsonb,
  custom_fields JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_contacts_company ON crm_contacts(company_id);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_owner ON crm_contacts(owner_id);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_email ON crm_contacts(email) WHERE email != '';
CREATE INDEX IF NOT EXISTS idx_crm_contacts_lifecycle ON crm_contacts(lifecycle_stage);
```

### 3.3 crm_leads（リード）

```sql
CREATE TABLE IF NOT EXISTS crm_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES crm_contacts(id) ON DELETE CASCADE,
  company_id UUID REFERENCES crm_companies(id) ON DELETE SET NULL,
  title TEXT NOT NULL,                  -- リード名（例: "〇〇社 Web制作案件"）
  status TEXT DEFAULT 'new' CHECK (status IN (
    'new', 'contacted', 'qualified', 'unqualified', 'converted', 'lost'
  )),
  source TEXT DEFAULT '' CHECK (source IN (
    '', 'web_form', 'cold_call', 'email_campaign', 'referral',
    'event', 'social_media', 'advertisement', 'hubspot', 'other'
  )),
  estimated_value NUMERIC DEFAULT 0,    -- 見込金額
  currency TEXT DEFAULT 'JPY',
  owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
  converted_deal_id UUID REFERENCES crm_deals(id) ON DELETE SET NULL,
  converted_at TIMESTAMPTZ,
  expected_close_date DATE,
  description TEXT DEFAULT '',
  tags JSONB DEFAULT '[]'::jsonb,
  custom_fields JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_leads_contact ON crm_leads(contact_id);
CREATE INDEX IF NOT EXISTS idx_crm_leads_status ON crm_leads(status);
CREATE INDEX IF NOT EXISTS idx_crm_leads_owner ON crm_leads(owner_id);
```

### 3.4 crm_deals（ディール / 商談）

```sql
CREATE TABLE IF NOT EXISTS crm_deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  company_id UUID REFERENCES crm_companies(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES crm_contacts(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES crm_leads(id) ON DELETE SET NULL,    -- リード由来
  pipeline_opportunity_id UUID REFERENCES pipeline_opportunities(id) ON DELETE SET NULL, -- 既存Pipeline連携
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,  -- 受注後プロジェクト
  stage TEXT DEFAULT 'proposal' CHECK (stage IN (
    'proposal', 'negotiation', 'contract_sent', 'won', 'lost', 'churned'
  )),
  amount NUMERIC DEFAULT 0,             -- 金額
  currency TEXT DEFAULT 'JPY',
  probability INTEGER DEFAULT 0 CHECK (probability BETWEEN 0 AND 100),
  expected_close_date DATE,
  actual_close_date DATE,
  owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
  loss_reason TEXT DEFAULT '',
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  description TEXT DEFAULT '',
  tags JSONB DEFAULT '[]'::jsonb,
  custom_fields JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_deals_company ON crm_deals(company_id);
CREATE INDEX IF NOT EXISTS idx_crm_deals_stage ON crm_deals(stage);
CREATE INDEX IF NOT EXISTS idx_crm_deals_owner ON crm_deals(owner_id);
CREATE INDEX IF NOT EXISTS idx_crm_deals_close_date ON crm_deals(expected_close_date);
CREATE INDEX IF NOT EXISTS idx_crm_deals_pipeline ON crm_deals(pipeline_opportunity_id);
```

### 3.5 crm_deal_items（ディール明細）

```sql
CREATE TABLE IF NOT EXISTS crm_deal_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES crm_deals(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  quantity NUMERIC DEFAULT 1,
  unit_price NUMERIC DEFAULT 0,
  discount_percent NUMERIC DEFAULT 0 CHECK (discount_percent BETWEEN 0 AND 100),
  amount NUMERIC GENERATED ALWAYS AS (quantity * unit_price * (1 - discount_percent / 100)) STORED,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_deal_items_deal ON crm_deal_items(deal_id);
```

### 3.6 crm_activities（アクティビティ）

```sql
CREATE TABLE IF NOT EXISTS crm_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('contact', 'company', 'lead', 'deal')),
  entity_id UUID NOT NULL,
  activity_type TEXT NOT NULL CHECK (activity_type IN (
    'note', 'call', 'email', 'meeting', 'task', 'stage_change', 'status_change', 'system'
  )),
  subject TEXT DEFAULT '',
  body TEXT DEFAULT '',
  outcome TEXT DEFAULT '',              -- 通話結果・ミーティング結果
  scheduled_at TIMESTAMPTZ,             -- 予定日時
  completed_at TIMESTAMPTZ,
  duration_minutes INTEGER,
  is_completed BOOLEAN DEFAULT false,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  metadata JSONB DEFAULT '{}'::jsonb,   -- 柔軟な追加データ
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_activities_entity
  ON crm_activities(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_crm_activities_user ON crm_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_crm_activities_type ON crm_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_crm_activities_scheduled ON crm_activities(scheduled_at)
  WHERE scheduled_at IS NOT NULL;
```

### 3.7 crm_import_logs（インポート履歴）

```sql
CREATE TABLE IF NOT EXISTS crm_import_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL CHECK (source IN ('csv', 'hubspot', 'salesforce', 'other')),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('contact', 'company', 'lead', 'deal')),
  file_name TEXT DEFAULT '',
  total_rows INTEGER DEFAULT 0,
  imported_rows INTEGER DEFAULT 0,
  skipped_rows INTEGER DEFAULT 0,
  error_rows INTEGER DEFAULT 0,
  error_details JSONB DEFAULT '[]'::jsonb,  -- [{row: 5, field: "email", error: "invalid format"}]
  field_mapping JSONB DEFAULT '{}'::jsonb,  -- カラムマッピング保存
  user_id UUID NOT NULL REFERENCES users(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_import_logs_user ON crm_import_logs(user_id);
```

### 3.8 RLSポリシー

```sql
-- 全CRMテーブルにRLS有効化
ALTER TABLE crm_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_deal_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_import_logs ENABLE ROW LEVEL SECURITY;

-- Admin/Director: 全データアクセス
-- Sales/Owner: 自分が担当のデータ + 全企業閲覧
-- Creator: 閲覧のみ（関連タスク参照用）

CREATE POLICY "crm_companies_select" ON crm_companies
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "crm_companies_modify" ON crm_companies
  FOR ALL TO authenticated USING (
    auth.uid() IN (
      SELECT id FROM users WHERE role IN ('admin', 'director')
    )
    OR owner_id = auth.uid()
  ) WITH CHECK (
    auth.uid() IN (
      SELECT id FROM users WHERE role IN ('admin', 'director')
    )
    OR owner_id = auth.uid()
  );

-- contacts / leads / deals も同様パターン（owner_id ベース）
-- deal_items は親 deal の owner_id を参照
-- activities は user_id = auth.uid() OR entity の owner
-- import_logs は admin のみ
```

> **[A10 Security Engineer]** CRMデータは個人情報を含む。`email`, `phone` フィールドには将来的にカラムレベル暗号化（pgcrypto）を検討。現時点ではRLS + TLS in transit で対応。GDPR/個人情報保護法対応として、コンタクト削除時は `crm_activities` のbodyも匿名化する論理削除オプションを Phase 2 で検討。

---

## 4. API設計

> **[A06 Backend Engineer]** 既存パターン（`/api/pipeline/`）に準拠。Next.js App Router の Route Handlers を使用。

### 4.1 エンドポイント一覧

```
src/app/api/crm/
├── companies/
│   ├── route.ts              GET (list+filter), POST (create)
│   └── [id]/
│       └── route.ts          GET, PATCH, DELETE
├── contacts/
│   ├── route.ts              GET (list+filter), POST (create)
│   └── [id]/
│       └── route.ts          GET, PATCH, DELETE
├── leads/
│   ├── route.ts              GET (list+filter), POST (create)
│   ├── [id]/
│   │   ├── route.ts          GET, PATCH, DELETE
│   │   └── convert/
│   │       └── route.ts      POST (リード→ディール変換)
│   └── bulk/
│       └── route.ts          PATCH (一括ステータス更新)
├── deals/
│   ├── route.ts              GET (list+filter), POST (create)
│   ├── [id]/
│   │   ├── route.ts          GET, PATCH, DELETE
│   │   └── items/
│   │       └── route.ts      GET, POST, PATCH, DELETE (明細)
│   └── summary/
│       └── route.ts          GET (集計・KPI)
├── activities/
│   └── route.ts              GET (entity_type+entity_id), POST
├── import/
│   ├── csv/
│   │   └── route.ts          POST (CSVアップロード+パース)
│   ├── hubspot/
│   │   └── route.ts          POST (HubSpot APIインポート)
│   ├── mapping/
│   │   └── route.ts          POST (フィールドマッピング確認)
│   └── execute/
│       └── route.ts          POST (マッピング確定→実行)
└── export/
    └── route.ts              GET (CSV/JSONエクスポート)
```

### 4.2 主要APIシグネチャ

```typescript
// GET /api/crm/contacts?company_id=xxx&lifecycle_stage=lead&owner_id=xxx&q=検索
// Response: { data: Contact[], total: number, page: number, pageSize: number }

// POST /api/crm/leads/:id/convert
// Body: { dealTitle: string, stage?: string, amount?: number }
// Response: { deal: Deal, lead: Lead } // lead.status → 'converted'

// POST /api/crm/import/csv
// Body: FormData (file + entity_type)
// Response: { importId: string, preview: Row[], headers: string[], suggestedMapping: FieldMapping }

// POST /api/crm/import/execute
// Body: { importId: string, mapping: FieldMapping, options: { skipDuplicates: boolean, updateExisting: boolean } }
// Response: { imported: number, skipped: number, errors: ImportError[] }
```

> **[A07 Compatibility Engineer]** インポートAPIは2段階設計（プレビュー → 確定実行）。ユーザーがフィールドマッピングを確認・修正してから実行できるようにする。HubSpot APIはOAuth不要で、APIキーベースのエクスポートJSONを受け付ける形式とする。

---

## 5. 型定義

> **[A05 Software Engineer]** `src/types/crm.ts` に集約。既存パターン（`database.ts`, `issue.ts`）に準拠。

```typescript
// src/types/crm.ts

// ---------------------------------------------------------------------------
// Enums / Literal Types
// ---------------------------------------------------------------------------

export type CompanySize = '' | 'solo' | '1-10' | '11-50' | '51-200' | '201-1000' | '1001+'
export type LeadSource = '' | 'inbound' | 'outbound' | 'referral' | 'event' | 'website' | 'social' | 'other'
export type LifecycleStage = 'subscriber' | 'lead' | 'mql' | 'sql' | 'opportunity' | 'customer' | 'evangelist' | 'other'
export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'unqualified' | 'converted' | 'lost'
export type DealStage = 'proposal' | 'negotiation' | 'contract_sent' | 'won' | 'lost' | 'churned'
export type DealPriority = 'low' | 'medium' | 'high' | 'critical'
export type CrmActivityType = 'note' | 'call' | 'email' | 'meeting' | 'task' | 'stage_change' | 'status_change' | 'system'
export type CrmEntityType = 'contact' | 'company' | 'lead' | 'deal'
export type ImportSource = 'csv' | 'hubspot' | 'salesforce' | 'other'

// ---------------------------------------------------------------------------
// Core Entities
// ---------------------------------------------------------------------------

export interface CrmCompany {
  id: string
  client_id: string | null
  name: string
  domain: string
  industry: string
  company_size: CompanySize
  phone: string
  website: string
  address: string
  description: string
  owner_id: string | null
  source: LeadSource
  tags: string[]
  custom_fields: Record<string, any>
  created_at: string
  updated_at: string
  // Relations
  owner?: { id: string; name: string; avatar_color: string }
  contacts_count?: number
  deals_count?: number
  total_deal_amount?: number
}

export interface CrmContact {
  id: string
  company_id: string | null
  first_name: string
  last_name: string
  email: string
  phone: string
  title: string
  department: string
  linkedin_url: string
  description: string
  owner_id: string | null
  lifecycle_stage: LifecycleStage
  lead_status: LeadStatus
  lead_score: number
  source: string
  last_contacted_at: string | null
  tags: string[]
  custom_fields: Record<string, any>
  created_at: string
  updated_at: string
  // Relations
  company?: Pick<CrmCompany, 'id' | 'name'>
  owner?: { id: string; name: string; avatar_color: string }
}

export interface CrmLead {
  id: string
  contact_id: string | null
  company_id: string | null
  title: string
  status: LeadStatus
  source: string
  estimated_value: number
  currency: string
  owner_id: string | null
  converted_deal_id: string | null
  converted_at: string | null
  expected_close_date: string | null
  description: string
  tags: string[]
  custom_fields: Record<string, any>
  created_at: string
  updated_at: string
  // Relations
  contact?: Pick<CrmContact, 'id' | 'first_name' | 'last_name' | 'email'>
  company?: Pick<CrmCompany, 'id' | 'name'>
  owner?: { id: string; name: string; avatar_color: string }
}

export interface CrmDeal {
  id: string
  title: string
  company_id: string | null
  contact_id: string | null
  lead_id: string | null
  pipeline_opportunity_id: string | null
  project_id: string | null
  stage: DealStage
  amount: number
  currency: string
  probability: number
  expected_close_date: string | null
  actual_close_date: string | null
  owner_id: string | null
  loss_reason: string
  priority: DealPriority
  description: string
  tags: string[]
  custom_fields: Record<string, any>
  created_at: string
  updated_at: string
  // Relations
  company?: Pick<CrmCompany, 'id' | 'name'>
  contact?: Pick<CrmContact, 'id' | 'first_name' | 'last_name' | 'email'>
  owner?: { id: string; name: string; avatar_color: string }
  items?: CrmDealItem[]
  items_total?: number
}

export interface CrmDealItem {
  id: string
  deal_id: string
  name: string
  description: string
  quantity: number
  unit_price: number
  discount_percent: number
  amount: number        // computed
  sort_order: number
  created_at: string
}

export interface CrmActivity {
  id: string
  entity_type: CrmEntityType
  entity_id: string
  activity_type: CrmActivityType
  subject: string
  body: string
  outcome: string
  scheduled_at: string | null
  completed_at: string | null
  duration_minutes: number | null
  is_completed: boolean
  user_id: string
  metadata: Record<string, any>
  created_at: string
  updated_at: string
  // Relations
  user?: { id: string; name: string; avatar_color: string }
}

// ---------------------------------------------------------------------------
// Import Types
// ---------------------------------------------------------------------------

export interface CrmImportLog {
  id: string
  source: ImportSource
  entity_type: CrmEntityType
  file_name: string
  total_rows: number
  imported_rows: number
  skipped_rows: number
  error_rows: number
  error_details: ImportError[]
  field_mapping: Record<string, string>
  user_id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  started_at: string | null
  completed_at: string | null
  created_at: string
}

export interface ImportError {
  row: number
  field: string
  value: string
  error: string
}

export interface FieldMapping {
  sourceField: string
  targetField: string
  transform?: 'none' | 'lowercase' | 'uppercase' | 'date' | 'number' | 'boolean'
}

// ---------------------------------------------------------------------------
// Filter Types
// ---------------------------------------------------------------------------

export interface CrmContactFilters {
  q?: string
  company_id?: string
  owner_id?: string
  lifecycle_stage?: LifecycleStage
  lead_status?: LeadStatus
  source?: string
  tags?: string[]
  page?: number
  pageSize?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface CrmDealFilters {
  q?: string
  company_id?: string
  contact_id?: string
  owner_id?: string
  stage?: DealStage | DealStage[]
  priority?: DealPriority
  min_amount?: number
  max_amount?: number
  expected_close_before?: string
  expected_close_after?: string
  page?: number
  pageSize?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface CrmLeadFilters {
  q?: string
  status?: LeadStatus
  source?: string
  owner_id?: string
  page?: number
  pageSize?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

// ---------------------------------------------------------------------------
// Dashboard / KPI Types
// ---------------------------------------------------------------------------

export interface CrmDashboardData {
  funnel: FunnelStage[]
  dealsByStage: { stage: DealStage; count: number; total_amount: number }[]
  recentActivities: CrmActivity[]
  upcomingTasks: CrmActivity[]
  conversionRate: number          // lead → deal %
  averageDealSize: number
  averageSalesCycle: number       // days
  wonDealsThisMonth: number
  lostDealsThisMonth: number
  pipelineValue: number           // total open deals
}

export interface FunnelStage {
  stage: string
  count: number
  value: number
  conversionRate: number          // to next stage %
}
```

---

## 6. 画面設計

> **[A04 UI/UX Engineer]** CRMは情報密度が高い。既存のタスク一覧・Pipeline UIパターンを踏襲しつつ、サブナビゲーション（タブ）でセクションを切り替える。

### 6.1 ナビゲーション

サイドバーに新規エントリを追加：

```typescript
// Sidebar.tsx MAIN_NAV に追加
{ id: 'crm', labelKey: 'nav.crm', icon: '🤝', href: '/crm', restricted: true }
```

CRM内はタブでサブページを切り替え：

```
/crm                → ダッシュボード（デフォルト）
/crm?tab=contacts   → コンタクト一覧
/crm?tab=companies  → 企業一覧
/crm?tab=leads      → リード一覧
/crm?tab=deals      → ディール一覧（カンバン / リスト切替）
/crm?tab=import     → インポート画面
```

> **[A04 UI/UX Engineer]** URL構造はクエリパラメータベースのタブ切替で既存Pipeline UIと統一。将来的にサブルート（`/crm/contacts/[id]`）に展開可能な設計にしておく。

### 6.2 画面一覧

#### 6.2.1 CRMダッシュボード（デフォルトタブ）

```
┌─────────────────────────────────────────────────────────────┐
│  CRM Dashboard                                    [期間▾]   │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │ Pipeline │ │ Won This │ │ Avg Deal │ │ Conv.    │      │
│  │ Value    │ │ Month    │ │ Size     │ │ Rate     │      │
│  │ ¥12.5M   │ │ ¥3.2M    │ │ ¥800K    │ │ 24%      │      │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘      │
│                                                             │
│  ┌─────────────────────────┐ ┌─────────────────────────┐   │
│  │  Funnel Chart           │ │  Deals by Stage          │   │
│  │  ┌───────────────────┐  │ │  ┌──────────────┐       │   │
│  │  │  New: 45          │  │ │  │ Proposal: 12 │ ¥9.6M │   │
│  │  │  ├──────────────┐ │  │ │  │ Negotiation:8│ ¥6.4M │   │
│  │  │  │ Qualified:28 │ │  │ │  │ Contract: 3  │ ¥2.1M │   │
│  │  │  │ ├─────────┐  │ │  │ │  └──────────────┘       │   │
│  │  │  │ │Proposal │  │ │  │ │                          │   │
│  │  └──┴─┴─────────┴──┘  │ └─────────────────────────┘   │
│  └─────────────────────────┘                               │
│                                                             │
│  ┌─────────────────────────┐ ┌─────────────────────────┐   │
│  │  Recent Activities      │ │  Upcoming Tasks          │   │
│  │  • 📞 田中: A社に電話   │ │  • 4/3 B社提案書送付     │   │
│  │  • 📧 佐藤: B社メール   │ │  • 4/5 C社ミーティング   │   │
│  │  • 📝 鈴木: C社メモ追加 │ │  • 4/7 D社契約書確認     │   │
│  └─────────────────────────┘ └─────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

#### 6.2.2 コンタクト一覧

```
┌─────────────────────────────────────────────────────────────┐
│  Contacts                [検索🔍] [フィルタ▾] [+ 新規] [⬇CSV]│
├─────────────────────────────────────────────────────────────┤
│  ┌─────┬──────┬────────┬────────┬──────┬───────┬─────────┐ │
│  │ 名前 │ 企業  │ メール  │ 役職   │ Stage│ Score │ 担当    │ │
│  ├─────┼──────┼────────┼────────┼──────┼───────┼─────────┤ │
│  │田中  │A社   │t@a.com │部長    │ SQL  │ 85    │ 佐藤    │ │
│  │鈴木  │B社   │s@b.com │課長    │ MQL  │ 62    │ 田中    │ │
│  │...   │      │        │        │      │       │         │ │
│  └─────┴──────┴────────┴────────┴──────┴───────┴─────────┘ │
│                                              [< 1 2 3 ... >]│
└─────────────────────────────────────────────────────────────┘
```

#### 6.2.3 ディール カンバンビュー

```
┌─────────────────────────────────────────────────────────────┐
│  Deals   [カンバン|リスト]  [フィルタ▾] [+ 新規ディール]      │
├─────────────────────────────────────────────────────────────┤
│ Proposal (5)  │ Negotiation (3) │ Contract (2)  │ Won (8)   │
│ ¥4.2M         │ ¥2.8M           │ ¥1.5M         │ ¥6.1M    │
│ ┌───────────┐ │ ┌───────────┐   │ ┌───────────┐ │          │
│ │ A社 Web   │ │ │ B社 App   │   │ │ D社 保守  │ │          │
│ │ ¥1.2M     │ │ │ ¥1.5M     │   │ │ ¥800K     │ │          │
│ │ 佐藤 60%  │ │ │ 田中 80%  │   │ │ 鈴木 90%  │ │          │
│ │ 4/15 〆    │ │ │ 4/10 〆   │   │ │ 4/20 〆   │ │          │
│ └───────────┘ │ └───────────┘   │ └───────────┘ │          │
│ ┌───────────┐ │ ┌───────────┐   │ ┌───────────┐ │          │
│ │ C社 LP    │ │ │ E社 SI    │   │ │ F社 開発  │ │          │
│ │ ¥500K     │ │ │ ¥800K     │   │ │ ¥700K     │ │          │
│ └───────────┘ │ └───────────┘   │ └───────────┘ │          │
│  Drag & Drop   │                 │               │          │
└─────────────────────────────────────────────────────────────┘
```

> **[A04 UI/UX Engineer]** カンバンは `@dnd-kit/core` でドラッグ&ドロップ実装。既存タスクカンバンのパターンを再利用。リストビューとの切替はローカルストレージで記憶。

#### 6.2.4 コンタクト/ディール 詳細ドロワー

```
┌──────────────────────────────────────────┐
│ [←] 田中太郎                    [✏][🗑] │
├──────────────────────────────────────────┤
│ 📧 tanaka@company.jp  📞 03-xxxx-xxxx  │
│ 🏢 A社 / 営業部長                       │
│ Stage: SQL    Score: 85/100             │
│ 担当: 佐藤                              │
├──────────────────────────────────────────┤
│ [概要] [アクティビティ] [ディール] [メモ] │
│                                          │
│ タイムライン                             │
│ ──────────────────────────────────       │
│ 4/2  📞 フォローアップ電話 (佐藤)       │
│ 3/28 📧 提案書送付 (佐藤)               │
│ 3/25 📝 初回ヒアリングメモ (田中)       │
│ 3/20 🔄 ステージ変更: Lead → MQL        │
│                                          │
│ [+ アクティビティ追加]                   │
└──────────────────────────────────────────┘
```

#### 6.2.5 インポート画面

```
┌─────────────────────────────────────────────────────────────┐
│  CRM Import                                                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Step 1: ソース選択                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                  │
│  │ 📄 CSV   │  │ 🟠 HubSpot│ │ ☁ Other  │                  │
│  └──────────┘  └──────────┘  └──────────┘                  │
│                                                              │
│  Step 2: エンティティ選択                                    │
│  (○) コンタクト  (○) 企業  (○) リード  (○) ディール          │
│                                                              │
│  Step 3: ファイルアップロード                                │
│  ┌──────────────────────────────────────────┐               │
│  │  📁 ドラッグ&ドロップ or クリック         │               │
│  └──────────────────────────────────────────┘               │
│                                                              │
│  Step 4: フィールドマッピング                                │
│  ┌────────────┬────────────┬──────────┐                     │
│  │ CSVカラム   │ → CRMフィールド │ プレビュー │                │
│  ├────────────┼────────────┼──────────┤                     │
│  │ Company    │ → name ▾       │ A社    │                     │
│  │ Email      │ → email ▾      │ t@a.co │                     │
│  │ Phone      │ → phone ▾      │ 03-xxx │                     │
│  │ Status     │ → lead_status ▾│ New    │                     │
│  └────────────┴────────────┴──────────┘                     │
│                                                              │
│  ☑ 重複スキップ（emailで判定）                               │
│  ☐ 既存レコード更新                                          │
│                                                              │
│  プレビュー: 150件中 148件インポート可能 / 2件エラー          │
│                                                              │
│  [キャンセル]                     [インポート実行]            │
└─────────────────────────────────────────────────────────────┘
```

> **[A07 Compatibility Engineer]** HubSpotインポートはエクスポートされたCSV形式（HubSpot標準エクスポート）をサポート。HubSpotのフィールド名を自動マッピングするプリセットを用意（例: `First Name` → `first_name`, `Company Name` → `company.name`）。Salesforce CSVも同様にプリセット対応。

---

## 7. コンポーネント設計

> **[A05 Software Engineer]** 既存パターンに準拠したコンポーネント構造。

### 7.1 ディレクトリ構造

```
src/
├── app/(main)/crm/
│   ├── page.tsx                     # メインCRMページ（タブ制御）
│   └── [entityType]/
│       └── [id]/
│           └── page.tsx             # 詳細ページ（将来拡張用）
├── components/crm/
│   ├── CrmDashboard.tsx             # KPIカード + チャート
│   ├── CrmTabNav.tsx                # サブタブナビゲーション
│   ├── contacts/
│   │   ├── ContactList.tsx          # コンタクト一覧テーブル
│   │   ├── ContactDetail.tsx        # 詳細ドロワー/パネル
│   │   ├── ContactForm.tsx          # 作成/編集フォーム
│   │   └── ContactFilters.tsx       # フィルタバー
│   ├── companies/
│   │   ├── CompanyList.tsx
│   │   ├── CompanyDetail.tsx
│   │   └── CompanyForm.tsx
│   ├── leads/
│   │   ├── LeadList.tsx
│   │   ├── LeadDetail.tsx
│   │   ├── LeadForm.tsx
│   │   └── LeadConvertDialog.tsx    # リード→ディール変換ダイアログ
│   ├── deals/
│   │   ├── DealList.tsx             # リストビュー
│   │   ├── DealKanban.tsx           # カンバンビュー
│   │   ├── DealCard.tsx             # カンバン用カード
│   │   ├── DealDetail.tsx
│   │   ├── DealForm.tsx
│   │   └── DealItemsTable.tsx       # 明細テーブル
│   ├── activities/
│   │   ├── ActivityTimeline.tsx      # タイムライン表示
│   │   └── ActivityForm.tsx          # アクティビティ追加フォーム
│   ├── import/
│   │   ├── ImportWizard.tsx          # ステップウィザード
│   │   ├── SourceSelector.tsx
│   │   ├── FieldMapper.tsx           # マッピングUI
│   │   ├── ImportPreview.tsx         # プレビュー表示
│   │   └── ImportResult.tsx          # 結果表示
│   └── shared/
│       ├── CrmStatusBadge.tsx        # ステータスバッジ
│       ├── LeadScoreBadge.tsx        # スコア表示
│       ├── FunnelChart.tsx           # ファネルチャート
│       └── DealAmountDisplay.tsx     # 金額表示（通貨対応）
├── hooks/
│   ├── useCrmContacts.ts
│   ├── useCrmCompanies.ts
│   ├── useCrmLeads.ts
│   ├── useCrmDeals.ts
│   ├── useCrmActivities.ts
│   └── useCrmImport.ts
├── lib/data/
│   ├── crm-contacts.ts
│   ├── crm-companies.ts
│   ├── crm-leads.ts
│   ├── crm-deals.ts
│   ├── crm-activities.ts
│   └── crm-import.ts
└── types/
    └── crm.ts                        # 型定義（セクション5）
```

### 7.2 主要コンポーネント仕様

#### CrmDashboard.tsx
```
Props: { period: 'week' | 'month' | 'quarter' | 'year' }
State: TanStack Query → /api/crm/deals/summary
Charts: Recharts (FunnelChart, BarChart for deals by stage)
KPI Cards: Pipeline Value, Won This Month, Avg Deal Size, Conversion Rate
```

#### DealKanban.tsx
```
Props: { filters: CrmDealFilters }
DnD: @dnd-kit/core + @dnd-kit/sortable
Columns: DealStage[] (動的、設定から取得)
Cards: DealCard (title, amount, owner, probability, close date)
Actions: onDrop → PATCH /api/crm/deals/:id { stage }
```

#### ImportWizard.tsx
```
Steps: [SourceSelect, EntitySelect, FileUpload, FieldMapping, Preview, Execute]
State: useReducer for wizard state
Validation: Zod schema per entity type
HubSpot preset: Auto-detect HubSpot CSV format by header names
```

> **[A09 QA Engineer]** 各コンポーネントにdata-testid属性を付与。ImportWizardは特にエッジケースが多い（文字コード、空行、不正値）のでユニットテストを厚くする。

---

## 8. データレイヤー

> **[A05 Software Engineer]** 既存の `src/lib/data/` パターンに完全準拠。Mock対応も含む。

```typescript
// src/lib/data/crm-contacts.ts（パターン例）

import { createServerClient } from '@/lib/supabase/server'
import { isMockMode } from '@/lib/mock/utils'
import type { CrmContact, CrmContactFilters } from '@/types/crm'

export async function getCrmContacts(filters?: CrmContactFilters): Promise<{
  data: CrmContact[]
  total: number
}> {
  if (isMockMode()) {
    return getMockContacts(filters)
  }

  const supabase = await createServerClient()
  let query = supabase
    .from('crm_contacts')
    .select(`
      *,
      company:crm_companies(id, name),
      owner:users!crm_contacts_owner_id_fkey(id, name, avatar_color)
    `, { count: 'exact' })

  if (filters?.q) {
    query = query.or(`first_name.ilike.%${filters.q}%,last_name.ilike.%${filters.q}%,email.ilike.%${filters.q}%`)
  }
  if (filters?.company_id) query = query.eq('company_id', filters.company_id)
  if (filters?.owner_id) query = query.eq('owner_id', filters.owner_id)
  if (filters?.lifecycle_stage) query = query.eq('lifecycle_stage', filters.lifecycle_stage)

  // Pagination
  const page = filters?.page ?? 1
  const pageSize = filters?.pageSize ?? 20
  const from = (page - 1) * pageSize
  query = query.range(from, from + pageSize - 1)

  // Sort
  const sortBy = filters?.sortBy ?? 'created_at'
  const sortOrder = filters?.sortOrder ?? 'desc'
  query = query.order(sortBy, { ascending: sortOrder === 'asc' })

  const { data, error, count } = await query
  if (error) throw error

  return { data: data as CrmContact[], total: count ?? 0 }
}

export async function getCrmContactById(id: string): Promise<CrmContact | null> { /* ... */ }
export async function createCrmContact(data: Partial<CrmContact>): Promise<CrmContact> { /* ... */ }
export async function updateCrmContact(id: string, data: Partial<CrmContact>): Promise<CrmContact> { /* ... */ }
export async function deleteCrmContact(id: string): Promise<void> { /* ... */ }
```

---

## 9. 外部インポート設計

> **[A07 Compatibility Engineer]** インポートは本CRMの重要機能。HubSpotを筆頭に、主要CRMからのデータ移行をサポート。

### 9.1 対応ソース

| ソース | 形式 | 対応エンティティ | マッピングプリセット |
|--------|------|-----------------|-------------------|
| CSV（汎用） | UTF-8/Shift_JIS CSV | 全エンティティ | なし（手動マッピング） |
| HubSpot | HubSpot Export CSV | Contacts, Companies, Deals | あり |
| Salesforce | Salesforce Export CSV | Contacts, Accounts, Opportunities | あり |
| Zoho CRM | Zoho Export CSV | Contacts, Accounts, Deals | あり |
| Pipedrive | Pipedrive Export CSV | Persons, Organizations, Deals | あり |
| kintone | kintone CSV Export | カスタム | あり（基本フィールド） |
| Excel | .xlsx (SheetJS) | 全エンティティ | なし |
| JSON | HubSpot API Export | Contacts, Companies, Deals | あり |

### 9.2 HubSpotフィールドマッピングプリセット

```typescript
// src/lib/crm/import-presets/hubspot.ts

export const HUBSPOT_CONTACT_MAPPING: FieldMapping[] = [
  { sourceField: 'First Name', targetField: 'first_name' },
  { sourceField: 'Last Name', targetField: 'last_name' },
  { sourceField: 'Email', targetField: 'email' },
  { sourceField: 'Phone Number', targetField: 'phone' },
  { sourceField: 'Job Title', targetField: 'title' },
  { sourceField: 'Company Name', targetField: '_company_name' },  // → crm_companies lookup/create
  { sourceField: 'Lifecycle Stage', targetField: 'lifecycle_stage', transform: 'lowercase' },
  { sourceField: 'Lead Status', targetField: 'lead_status', transform: 'lowercase' },
  { sourceField: 'HubSpot Score', targetField: 'lead_score', transform: 'number' },
  { sourceField: 'Original Source', targetField: 'source' },
  { sourceField: 'Create Date', targetField: 'created_at', transform: 'date' },
]

export const HUBSPOT_COMPANY_MAPPING: FieldMapping[] = [
  { sourceField: 'Name', targetField: 'name' },
  { sourceField: 'Company Domain Name', targetField: 'domain' },
  { sourceField: 'Industry', targetField: 'industry' },
  { sourceField: 'Number of Employees', targetField: 'company_size', transform: 'companySize' },
  { sourceField: 'Phone Number', targetField: 'phone' },
  { sourceField: 'Website URL', targetField: 'website' },
  { sourceField: 'City', targetField: '_city' },  // → address に結合
  { sourceField: 'State/Region', targetField: '_state' },
]

export const HUBSPOT_DEAL_MAPPING: FieldMapping[] = [
  { sourceField: 'Deal Name', targetField: 'title' },
  { sourceField: 'Amount', targetField: 'amount', transform: 'number' },
  { sourceField: 'Deal Stage', targetField: 'stage', transform: 'dealStage' },
  { sourceField: 'Close Date', targetField: 'expected_close_date', transform: 'date' },
  { sourceField: 'Pipeline', targetField: '_pipeline' },  // metadata
  { sourceField: 'Deal Owner', targetField: '_owner_email' },  // → users lookup
  { sourceField: 'Associated Company', targetField: '_company_name' },
  { sourceField: 'Associated Contact', targetField: '_contact_email' },
]
```

### 9.3 インポートフロー

```
1. ファイルアップロード
   └→ POST /api/crm/import/csv { file, entityType }
   └→ Response: { importId, headers, preview (first 5 rows), suggestedMapping }

2. マッピング確認（UI側）
   └→ ユーザーがフィールドマッピングを確認・修正
   └→ HubSpotプリセットの場合は自動マッピング済み

3. バリデーション
   └→ POST /api/crm/import/mapping { importId, mapping }
   └→ Response: { valid: 148, invalid: 2, errors: [...] }

4. 実行
   └→ POST /api/crm/import/execute { importId, mapping, options }
   └→ バッチ処理（100件ずつ upsert）
   └→ Response: { imported, skipped, errors, importLogId }

5. 結果表示
   └→ ImportResult コンポーネントで成功/失敗サマリー
   └→ エラー行のCSVダウンロード可能
```

### 9.4 CSVエクスポート

```typescript
// GET /api/crm/export?entity=contacts&format=csv&filters=...
// GET /api/crm/export?entity=deals&format=csv&stage=won

// エクスポートオプション:
// - フィルタ条件適用
// - カラム選択（デフォルト: 全フィールド）
// - 文字コード: UTF-8 (BOM付き) / Shift_JIS
// - 日付フォーマット: yyyy-MM-dd / yyyy/MM/dd
```

> **[A07 Compatibility Engineer]** Shift_JIS対応はExcelでの直接オープンに必要。UTF-8 BOM付きがデフォルト（Excel 2016+で自動認識）。`encoding-japanese` ライブラリで変換。

---

## 10. 既存機能との統合

> **[A15 Integration Architect]** CRMは既存のPipeline・Project・Client・Taskと密接に連携する。

### 10.1 統合ポイント

| 連携元 → 連携先 | トリガー | アクション |
|----------------|---------|-----------|
| CRM Company → Client | ディール Won時 | client テーブルに自動作成（未存在の場合） |
| CRM Deal → Pipeline Opportunity | 手動リンク or 自動 | pipeline_opportunity_id で紐付け |
| CRM Deal → Project | ディール Won時 | プロジェクト作成ダイアログ表示 |
| Client → CRM Company | クライアント閲覧時 | CRM企業情報をサイドパネル表示 |
| CRM Contact → User | 社内メンバーの場合 | user_id でリンク（任意） |
| Task → CRM Activity | タスク完了時 | CRM側にアクティビティ自動記録（設定で有効化） |

### 10.2 リード→ディール変換フロー

```
[Lead Qualified]
  │
  ├── LeadConvertDialog.tsx 表示
  │   ├── ディールタイトル（リード名から自動入力）
  │   ├── 金額（見込金額から転記）
  │   ├── ステージ（デフォルト: proposal）
  │   ├── 担当者（リード担当者から転記）
  │   └── ☑ リードをConvertedに変更
  │
  └── POST /api/crm/leads/:id/convert
      ├── crm_deals INSERT
      ├── crm_leads UPDATE (status → 'converted', converted_deal_id)
      ├── crm_activities INSERT (type: 'stage_change', '変換実行')
      └── Response: { deal, lead }
```

### 10.3 ディール→プロジェクト連携

```
[Deal Won]
  │
  ├── 自動プロンプト: "プロジェクトを作成しますか？"
  │   ├── はい → プロジェクト作成フォーム（ディール情報から自動入力）
  │   │   ├── プロジェクト名 ← ディールタイトル
  │   │   ├── クライアント ← CRM企業 → clientsテーブル
  │   │   └── 予算 ← ディール金額
  │   └── いいえ → スキップ（後から手動リンク可能）
  │
  └── crm_deals UPDATE (project_id)
```

> **[A03 Project Manager]** ディール→プロジェクト変換は営業→デリバリーの引継ぎポイント。ディールの情報（要件メモ、コンタクト情報）がプロジェクト側から参照できるようにする。

---

## 11. i18n キー設計

> **[A11 i18n Engineer]** `crm.` プレフィックスで名前空間を分離。既存 `translations.ts` に追加。

```typescript
// 主要キー（抜粋）— JA/EN 両方で約200キー追加見込み

// Navigation
'nav.crm': 'CRM' / 'CRM'

// Common
'crm.title': '顧客管理' / 'CRM'
'crm.dashboard': 'ダッシュボード' / 'Dashboard'
'crm.contacts': 'コンタクト' / 'Contacts'
'crm.companies': '企業' / 'Companies'
'crm.leads': 'リード' / 'Leads'
'crm.deals': 'ディール' / 'Deals'
'crm.activities': 'アクティビティ' / 'Activities'
'crm.import': 'インポート' / 'Import'
'crm.export': 'エクスポート' / 'Export'

// Contact fields
'crm.contact.firstName': '名' / 'First Name'
'crm.contact.lastName': '姓' / 'Last Name'
'crm.contact.email': 'メール' / 'Email'
'crm.contact.phone': '電話番号' / 'Phone'
'crm.contact.title': '役職' / 'Job Title'
'crm.contact.department': '部署' / 'Department'
'crm.contact.lifecycleStage': 'ライフサイクル' / 'Lifecycle Stage'
'crm.contact.leadScore': 'リードスコア' / 'Lead Score'
'crm.contact.lastContacted': '最終コンタクト' / 'Last Contacted'

// Lifecycle stages
'crm.stage.subscriber': '購読者' / 'Subscriber'
'crm.stage.lead': 'リード' / 'Lead'
'crm.stage.mql': 'MQL' / 'MQL'
'crm.stage.sql': 'SQL' / 'SQL'
'crm.stage.opportunity': '商談' / 'Opportunity'
'crm.stage.customer': '顧客' / 'Customer'
'crm.stage.evangelist': 'エバンジェリスト' / 'Evangelist'

// Deal stages
'crm.deal.proposal': '提案中' / 'Proposal'
'crm.deal.negotiation': '交渉中' / 'Negotiation'
'crm.deal.contractSent': '契約書送付済' / 'Contract Sent'
'crm.deal.won': '成約' / 'Won'
'crm.deal.lost': '失注' / 'Lost'
'crm.deal.churned': '解約' / 'Churned'

// Lead statuses
'crm.lead.new': '新規' / 'New'
'crm.lead.contacted': '接触済' / 'Contacted'
'crm.lead.qualified': '見込確認済' / 'Qualified'
'crm.lead.unqualified': '見込なし' / 'Unqualified'
'crm.lead.converted': '変換済' / 'Converted'
'crm.lead.lost': '失注' / 'Lost'

// KPI
'crm.kpi.pipelineValue': 'パイプライン金額' / 'Pipeline Value'
'crm.kpi.wonThisMonth': '今月の成約' / 'Won This Month'
'crm.kpi.avgDealSize': '平均ディールサイズ' / 'Avg Deal Size'
'crm.kpi.conversionRate': '変換率' / 'Conversion Rate'
'crm.kpi.avgSalesCycle': '平均営業サイクル' / 'Avg Sales Cycle'

// Import
'crm.import.selectSource': 'ソースを選択' / 'Select Source'
'crm.import.selectEntity': 'エンティティを選択' / 'Select Entity'
'crm.import.uploadFile': 'ファイルをアップロード' / 'Upload File'
'crm.import.mapFields': 'フィールドマッピング' / 'Map Fields'
'crm.import.preview': 'プレビュー' / 'Preview'
'crm.import.execute': 'インポート実行' / 'Execute Import'
'crm.import.result': 'インポート結果' / 'Import Result'
'crm.import.skipDuplicates': '重複をスキップ' / 'Skip Duplicates'
'crm.import.updateExisting': '既存レコードを更新' / 'Update Existing'
'crm.import.hubspotPreset': 'HubSpotプリセット適用' / 'Apply HubSpot Preset'

// Activities
'crm.activity.note': 'メモ' / 'Note'
'crm.activity.call': '電話' / 'Call'
'crm.activity.email': 'メール' / 'Email'
'crm.activity.meeting': 'ミーティング' / 'Meeting'
'crm.activity.task': 'タスク' / 'Task'

// Actions
'crm.action.convertLead': 'ディールに変換' / 'Convert to Deal'
'crm.action.createProject': 'プロジェクトを作成' / 'Create Project'
'crm.action.linkPipeline': 'Pipelineに紐付け' / 'Link to Pipeline'
```

---

## 12. アクセス制御

> **[A10 Security Engineer]** CRMデータへのアクセスは厳格に制御。

### 12.1 権限マトリクス

| 操作 | Admin | Director | Sales* | Creator | Requester |
|------|-------|----------|--------|---------|-----------|
| CRMダッシュボード閲覧 | ✅ | ✅ | ✅ | ❌ | ❌ |
| コンタクト一覧閲覧 | ✅ (全件) | ✅ (全件) | ✅ (担当分) | ❌ | ❌ |
| コンタクト作成/編集 | ✅ | ✅ | ✅ (担当分) | ❌ | ❌ |
| コンタクト削除 | ✅ | ❌ | ❌ | ❌ | ❌ |
| リード管理 | ✅ | ✅ | ✅ (担当分) | ❌ | ❌ |
| ディール管理 | ✅ | ✅ | ✅ (担当分) | ❌ | ❌ |
| ディール Won/Lost 変更 | ✅ | ✅ | ✅ (要承認)** | ❌ | ❌ |
| インポート実行 | ✅ | ✅ | ❌ | ❌ | ❌ |
| エクスポート実行 | ✅ | ✅ | ✅ (担当分) | ❌ | ❌ |
| CRM設定変更 | ✅ | ❌ | ❌ | ❌ | ❌ |

*Sales ロールは未追加の場合、Pipeline同様の名前ベースホワイトリストで代替
**Phase 2: 承認ワークフロー

### 12.2 フロントエンド制御

```typescript
// CRM access check (Sidebar.tsx pattern)
const CRM_ALLOWED_ROLES = ['admin', 'director']
const CRM_ALLOWED_USERS = ['安田', '伊藤', '瀧宮', '渡邊', '渡辺']

function canSeeCRM(u: { role: string; name: string } | null): boolean {
  if (!u) return false
  if (CRM_ALLOWED_ROLES.includes(u.role)) return true
  return CRM_ALLOWED_USERS.some((n) => u.name.includes(n))
}
```

---

## 13. テスト戦略

> **[A09 QA Engineer]** 既存テストパターン（Vitest + Playwright）に準拠。

### 13.1 ユニットテスト

| テスト対象 | ファイル | ケース数（目安） |
|-----------|---------|----------------|
| crm-contacts.ts | `tests/unit/crm-contacts.test.ts` | 15 |
| crm-deals.ts | `tests/unit/crm-deals.test.ts` | 18 |
| crm-leads.ts (convert) | `tests/unit/crm-leads.test.ts` | 12 |
| Import CSV parser | `tests/unit/crm-import.test.ts` | 20 |
| HubSpot mapping | `tests/unit/crm-hubspot-mapping.test.ts` | 10 |
| Field validation (Zod) | `tests/unit/crm-validation.test.ts` | 15 |

### 13.2 E2Eテスト

| シナリオ | ファイル | 概要 |
|---------|---------|------|
| S20 コンタクトCRUD | `tests/e2e/scenarios/S20-crm-contacts.spec.ts` | 作成→編集→検索→削除 |
| S21 リード→ディール変換 | `tests/e2e/scenarios/S21-crm-lead-conversion.spec.ts` | リード作成→Qualify→変換→ディール確認 |
| S22 ディールカンバン | `tests/e2e/scenarios/S22-crm-deal-kanban.spec.ts` | D&Dでステージ変更→KPI更新確認 |
| S23 CSVインポート | `tests/e2e/scenarios/S23-crm-csv-import.spec.ts` | アップロード→マッピング→実行→結果確認 |
| S24 HubSpotインポート | `tests/e2e/scenarios/S24-crm-hubspot-import.spec.ts` | HubSpot CSV→プリセット適用→インポート |
| S25 エクスポート | `tests/e2e/scenarios/S25-crm-export.spec.ts` | フィルタ→CSV DL→内容検証 |
| S26 ディール→プロジェクト | `tests/e2e/scenarios/S26-crm-deal-to-project.spec.ts` | Won→プロジェクト作成→クライアント同期 |

### 13.3 エッジケース

> **[A09 QA Engineer]** 特に注意すべきケース:

- CSVインポート: BOM付きUTF-8, Shift_JIS, 空行, カンマ含む値, 改行含む値
- HubSpotインポート: 日付フォーマットのバリエーション（US形式 `MM/DD/YYYY`）
- 重複検出: email一致、domain一致、名前の表記ゆれ
- リード変換: 同一リードの二重変換防止
- ディール金額: 0円、マイナス値、通貨変換
- カンバンD&D: 同時編集時のオプティミスティック更新とロールバック
- 大量データ: 1万件超のコンタクト表示パフォーマンス

---

## 14. パフォーマンス考慮

> **[A06 Backend Engineer]** + **[A05 Software Engineer]**

| 項目 | 対策 |
|------|------|
| コンタクト一覧（大量） | サーバーサイドページネーション（`.range()`）、仮想スクロール検討 |
| カンバンビュー | 各ステージ上限50件表示、"もっと見る"ボタン |
| ダッシュボードKPI | DB側で集計（`COUNT`, `SUM`）、5分キャッシュ |
| CSVインポート（大量） | 100件バッチ upsert、プログレスバー表示 |
| 検索 | デバウンス300ms（既存パターン）、`ILIKE` + GINインデックス検討 |
| Realtime | `crm_deals` テーブルのみ Supabase Realtime（ステージ変更の即時反映） |

---

## 15. マイグレーション戦略

> **[A12 DevOps Engineer]** 既存データへの影響を最小化。

### 15.1 マイグレーション順序

```
028_create_crm.sql
├── crm_companies (client_id FK to clients)
├── crm_contacts (company_id FK to crm_companies)
├── crm_leads (contact_id FK, company_id FK)
├── crm_deals (company_id, contact_id, lead_id, pipeline_opportunity_id, project_id FKs)
├── crm_deal_items (deal_id FK)
├── crm_activities (polymorphic entity_type + entity_id)
├── crm_import_logs
├── All indexes
├── All RLS policies
└── Updated_at trigger function (shared)
```

### 15.2 ロールバック計画

```sql
-- 028_create_crm.sql のロールバック（完全に新規テーブルのみなので安全）
DROP TABLE IF EXISTS crm_import_logs CASCADE;
DROP TABLE IF EXISTS crm_activities CASCADE;
DROP TABLE IF EXISTS crm_deal_items CASCADE;
DROP TABLE IF EXISTS crm_deals CASCADE;
DROP TABLE IF EXISTS crm_leads CASCADE;
DROP TABLE IF EXISTS crm_contacts CASCADE;
DROP TABLE IF EXISTS crm_companies CASCADE;
```

> **[A12 DevOps Engineer]** 既存テーブルへの変更は一切なし。新規テーブルのみなのでロールバックはDROPで完了。FK参照先（clients, users, projects, pipeline_opportunities）は `ON DELETE SET NULL` なので既存データに影響しない。

---

## 16. ロードマップ

> **[A13 Product Owner]** + **[A03 Project Manager]**

### Phase 1 — MVP（推定 4-5 スプリント）

| スプリント | 内容 |
|-----------|------|
| Sprint 1 | DB マイグレーション、型定義、データレイヤー、API Route (CRUD) |
| Sprint 2 | コンタクト・企業の一覧/詳細/作成/編集 UI |
| Sprint 3 | リード管理 + ディール管理（カンバン含む）+ リード変換 |
| Sprint 4 | CSVインポート/エクスポート + HubSpotプリセット |
| Sprint 5 | ダッシュボード KPI + アクセス制御 + i18n + テスト |

### Phase 2 — 拡張（Phase 1 完了後）

- メールテンプレート連携（CRMアクティビティからメール送信）
- リードスコアリング自動化（アクティビティベース）
- ナーチャリングワークフロー（自動フォローアップリマインダー）
- ディール承認ワークフロー
- GDPR/個人情報保護対応（論理削除、匿名化）
- Salesforce / Zoho / Pipedrive 直接API連携

### Phase 3 — 高度化

- AI売上予測（過去データベース）
- 自動リード割当（ラウンドロビン / 負荷分散）
- マーケティングキャンペーン管理
- Webhookトリガー（ステージ変更時の外部通知）
- モバイルアプリ対応

---

## 17. エージェント最終レビュー

| エージェント | 承認 | コメント |
|-------------|------|---------|
| A01 CRM Manager | ✅ | ファネル設計がHubSpot互換で実用的。Phase 2のスコアリングを楽しみにしている |
| A02 Sales Manager | ✅ | カンバンビューでのディール管理が直感的。滞在日数のアラートをPhase 1に含めてほしい（→検討） |
| A03 Project Manager | ✅ | ディール→プロジェクト連携が明確。スプリント計画は現実的 |
| A04 UI/UX Engineer | ✅ | 既存UIパターンとの一貫性が保たれている。カンバンのD&Dは既存実装を再利用可能 |
| A05 Software Engineer | ✅ | 型定義・データレイヤーが既存パターン完全準拠。Mock対応も忘れずに |
| A06 Backend Engineer | ✅ | DB設計はノーマライズされており拡張性が高い。インデックス設計も適切 |
| A07 Compatibility Engineer | ✅ | HubSpot/Salesforceプリセットで移行コストを大幅削減。文字コード対応も万全 |
| A08 Data Analyst | ✅ | KPIが適切。Phase 3のAI予測に向けてデータ蓄積の基盤になる |
| A09 QA Engineer | ✅ | E2Eシナリオが網羅的。インポートのエッジケースが最大のリスク |
| A10 Security Engineer | ✅ | RLSポリシーが適切。Phase 2での暗号化検討を忘れずに |
| A11 i18n Engineer | ✅ | `crm.` 名前空間で既存キーと衝突なし。約200キー追加は manageable |
| A12 DevOps Engineer | ✅ | 新規テーブルのみでリスク低。ロールバックも容易 |
| A13 Product Owner | ✅ | MVPスコープが適切。Phase 1で十分な価値提供が可能 |
| A14 Customer Success | ✅ | インポートウィザードのUXが初回導入のハードルを下げる。ツールチップでのヘルプを追加希望 |
| A15 Integration Architect | ✅ | 既存Pipeline/Client/Projectとの連携設計が明確。二重管理のリスクを最小化 |

---

---

# Part II — ランディングページ・予約システム・LINE連携

**追記日**: 2026-04-02
**起案**: A01 CRM Manager
**議論参加**: 全15エージェント

---

## 18. 概要 — リードキャプチャ基盤

### 18.1 背景と目的

> **[A01 CRM Manager]** Part I のCRM機能はすべて「社内で管理する側」の仕組みだった。しかしリードはどこから来るのか？ その入口を設計しなければCRMは空箱になる。本セクションではリード獲得チャネルとして **外部ランディングページ（LP）**、**相談予約システム**、**LINE公式アカウント連携** の3本柱を定義する。

> **[A02 Sales Manager]** 実際の営業フローを考えると、以下の導線がある:
> 1. LP経由の問い合わせフォーム → リード自動作成
> 2. LP上の予約ボタン → Google Meet / 対面の相談枠を予約 → リード+アクティビティ自動作成
> 3. LINE友だち追加 → トーク内の自動応答 → リード自動作成
>
> すべてのチャネルからCRMのリードに合流する設計が必要。

> **[A13 Product Owner]** LP自体は外部ホスティング（Vercel別プロジェクト or サブドメイン）も選択肢だが、まずは本アプリ内に `/lp` として公開ルートを設置する方針で議論する。後から切り出しも可能。

### 18.2 全体アーキテクチャ

```
                         ┌─────────────────────┐
                         │   LINE 公式アカウント  │
                         │   (Messaging API)    │
                         └──────────┬──────────┘
                                    │ Webhook
                                    ▼
┌──────────────┐    ┌──────────────────────────────────────┐
│   外部LP      │    │        WorkFlow (Next.js)             │
│   /lp/*       │───▶│                                      │
│   (公開)      │    │  ┌──────────┐  ┌──────────────────┐  │
└──────────────┘    │  │ /api/lp/ │  │ /api/line/       │  │
                    │  │ form     │  │ webhook          │  │
                    │  │ booking  │  │                  │  │
                    │  └────┬─────┘  └────────┬─────────┘  │
                    │       │                 │             │
                    │       ▼                 ▼             │
                    │  ┌─────────────────────────────┐     │
                    │  │      CRM Core                │     │
                    │  │  crm_contacts / crm_leads    │     │
                    │  │  crm_activities              │     │
                    │  │  crm_bookings (NEW)          │     │
                    │  └──────────┬──────────────────┘     │
                    │             │                         │
                    │             ▼                         │
                    │  ┌──────────────────────┐            │
                    │  │  Google Calendar API  │            │
                    │  │  (予約枠管理)         │            │
                    │  │  + Google Meet 自動生成│            │
                    │  └──────────────────────┘            │
                    └──────────────────────────────────────┘
```

> **[A15 Integration Architect]** 3つのチャネルすべてが最終的に `crm_contacts` + `crm_leads` + `crm_activities` に着地する。予約は新テーブル `crm_bookings` で管理し、Google Calendar は外部同期先として扱う。

> **[A10 Security Engineer]** LP と予約 API は**認証不要（公開エンドポイント）**。レート制限・CAPTCHA・CSRF対策が必須。LINE Webhook は署名検証で保護。

---

## 19. ランディングページ（LP）

### 19.1 ルーティング設計

> **[A05 Software Engineer]** 認証不要の公開ページとして `(public)` レイアウトグループに配置。既存の `(auth)` / `(main)` と並列。

```
src/app/
├── (auth)/          # ログイン等
├── (main)/          # 認証済みメイン
├── (public)/        # 認証不要・公開
│   ├── layout.tsx   # 最小限レイアウト（サイドバーなし）
│   └── lp/
│       ├── page.tsx              # メインLP
│       ├── booking/
│       │   └── page.tsx          # 予約ページ
│       ├── booking-complete/
│       │   └── page.tsx          # 予約完了ページ
│       ├── contact-complete/
│       │   └── page.tsx          # 問い合わせ完了ページ
│       └── [slug]/
│           └── page.tsx          # キャンペーン別LP（将来拡張）
└── api/
    ├── lp/
    │   ├── contact/
    │   │   └── route.ts          # POST: 問い合わせフォーム送信
    │   └── booking/
    │       ├── route.ts          # POST: 予約作成
    │       ├── slots/
    │       │   └── route.ts      # GET: 空き枠取得
    │       └── cancel/
    │           └── route.ts      # POST: 予約キャンセル
    ├── line/
    │   └── webhook/
    │       └── route.ts          # POST: LINE Webhook
    └── crm/
        └── ...                   # 既存CRM API
```

### 19.2 LPページ構成

> **[A04 UI/UX Engineer]** LPは独立したビジュアルデザイン。管理画面のshadcn/uiスタイルとは異なり、マーケティング向けの訴求力のあるデザインにする。ただしTailwind CSSは共有。

```
┌─────────────────────────────────────────────────────────┐
│  [ロゴ]                              [お問い合わせ] [予約] │
├─────────────────────────────────────────────────────────┤
│                                                          │
│              ヘッドライン                                 │
│         「ビジネスの成長を加速する」                       │
│              サブヘッドライン                              │
│                                                          │
│     [無料相談を予約する]   [まずは問い合わせる]            │
│                                                          │
├─────────────────────────────────────────────────────────┤
│  サービス紹介セクション                                   │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐                 │
│  │ Feature1│  │ Feature2│  │ Feature3│                 │
│  └─────────┘  └─────────┘  └─────────┘                 │
├─────────────────────────────────────────────────────────┤
│  お客様の声 / 導入事例                                    │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ─── お問い合わせフォーム ───                             │
│                                                          │
│  企業名   [                          ]                   │
│  お名前   [         ] [              ]                   │
│  メール   [                          ]                   │
│  電話番号 [                          ]                   │
│  ご相談内容                                              │
│  (○) サービスについて  (○) 料金について                   │
│  (○) 導入相談         (○) その他                         │
│  メッセージ                                              │
│  [                                   ]                   │
│  [                                   ]                   │
│                                                          │
│  ☑ プライバシーポリシーに同意する                         │
│                                                          │
│  [        送信する        ]                              │
│                                                          │
├─────────────────────────────────────────────────────────┤
│  LINE で相談する                                         │
│  ┌─────────────────────┐                                │
│  │ [LINE友だち追加ボタン] │   QRコード                    │
│  │  @workflow-crm       │   ┌───────┐                   │
│  └─────────────────────┘   │ █▀▀█▀ │                   │
│                             │ █ QR █ │                   │
│                             └───────┘                   │
├─────────────────────────────────────────────────────────┤
│  フッター: 会社情報 / プライバシーポリシー / 特商法表記    │
└─────────────────────────────────────────────────────────┘
```

> **[A14 Customer Success]** LP→フォーム送信後のサンクスページで「予約もできます」と誘導するのが効果的。LINE友だち追加ボタンも含めてクロスチャネルの導線を設計する。

> **[A01 CRM Manager]** フォームの各フィールドにはUTMパラメータ（`utm_source`, `utm_medium`, `utm_campaign`）を隠しフィールドとして自動取得。リードのソース分析に必須。

### 19.3 問い合わせフォーム API

```typescript
// POST /api/lp/contact
// Content-Type: application/json
// 認証不要（公開エンドポイント）

interface LPContactRequest {
  company_name: string
  first_name: string
  last_name: string
  email: string              // required, validated
  phone?: string
  inquiry_type: 'service' | 'pricing' | 'consultation' | 'other'
  message: string
  privacy_agreed: true       // must be true
  // Auto-captured (hidden fields)
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_term?: string
  utm_content?: string
  referrer?: string
  landing_page?: string
  user_agent?: string
}

interface LPContactResponse {
  success: boolean
  message: string           // "お問い合わせありがとうございます"
  contactId?: string        // 内部用（レスポンスには含めない）
}

// 処理フロー:
// 1. reCAPTCHA v3 スコア検証（閾値 0.5）
// 2. Zod バリデーション
// 3. レート制限チェック（同一IP: 5回/時間、同一email: 3回/日）
// 4. crm_companies UPSERT (company_name + domain)
// 5. crm_contacts UPSERT (email で重複チェック)
// 6. crm_leads INSERT (source: 'web_form', status: 'new')
// 7. crm_activities INSERT (type: 'system', subject: 'LP問い合わせ')
// 8. 通知メール送信（担当者 or デフォルト営業チーム）
// 9. 問い合わせ確認メール送信（送信者）
```

> **[A10 Security Engineer]** 公開エンドポイントの防御レイヤー:
> - **reCAPTCHA v3**: Bot防止（`@google-recaptcha/react`）
> - **Rate Limiting**: `upstash/ratelimit` or カスタム（Supabase RPC）
> - **Input Sanitization**: XSS対策（DOMPurify でHTMLタグ除去）
> - **Email Validation**: 使い捨てメールドメインブロック（オプション）
> - **CORS**: LP のオリジンのみ許可（別ドメインの場合）

> **[A06 Backend Engineer]** Admin Supabase クライアント（service_role key）を使用。公開APIからの書き込みはRLSをバイパスする必要があるため、サーバーサイドのみで処理。

---

## 20. 予約システム（Booking）

### 20.1 概要

> **[A01 CRM Manager]** 予約の種類は2つ:
> 1. **オンライン相談** — Google Meet リンクを自動生成して送付
> 2. **対面相談** — 場所を選択して予約確定
>
> どちらも Google Calendar をバックエンドとして使い、空き枠の管理と二重予約防止を実現する。

> **[A02 Sales Manager]** 予約が入ったら即座にCRMにリード+アクティビティが作成されるのが理想。営業チームは朝一でその日の予約を確認して準備する。

### 20.2 Google Calendar 連携アーキテクチャ

```
┌──────────────────┐     ┌──────────────────┐
│   LP 予約ページ    │     │  CRM 管理画面      │
│  (公開)           │     │  (認証済み)        │
└───────┬──────────┘     └───────┬──────────┘
        │                        │
        ▼                        ▼
┌──────────────────────────────────────────┐
│          /api/lp/booking/*               │
│          /api/crm/bookings/*             │
└───────────────────┬──────────────────────┘
                    │
                    ▼
┌──────────────────────────────────────────┐
│         Google Calendar API v3           │
│  ┌────────────────────────────────────┐  │
│  │  Service Account (server-to-server)│  │
│  │  OR OAuth2 (admin 認証)            │  │
│  └────────────────────────────────────┘  │
│                                          │
│  Calendar: crm-bookings@company.com      │
│  ┌──────────────────────────────────┐    │
│  │ Event = 予約枠                    │    │
│  │ ├── summary: "相談予約: 田中様"   │    │
│  │ ├── attendees: [担当者, 予約者]   │    │
│  │ ├── conferenceData: Google Meet   │    │
│  │ ├── location: "東京オフィス"      │    │
│  │ └── extendedProperties:           │    │
│  │     { bookingId, contactId }      │    │
│  └──────────────────────────────────┘    │
└──────────────────────────────────────────┘
```

> **[A07 Compatibility Engineer]** Google Calendar API は **Service Account** 方式を推奨。管理者が一度ドメイン委任（Domain-Wide Delegation）を設定すれば、以降はサーバーサイドで完結し、ユーザーの OAuth 認証画面が不要になる。
>
> 必要な API スコープ:
> - `https://www.googleapis.com/auth/calendar` — カレンダー読み書き
> - `https://www.googleapis.com/auth/calendar.events` — イベント管理

> **[A12 DevOps Engineer]** Service Account キーは `GOOGLE_SERVICE_ACCOUNT_KEY` 環境変数として Vercel に設定。`.env.local` にも開発用キーを格納。

### 20.3 データベース設計

```sql
-- 028_create_crm.sql に追加（または 029_create_crm_bookings.sql）

CREATE TABLE IF NOT EXISTS crm_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 予約者情報
  contact_id UUID REFERENCES crm_contacts(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES crm_leads(id) ON DELETE SET NULL,
  guest_name TEXT NOT NULL,
  guest_email TEXT NOT NULL,
  guest_phone TEXT DEFAULT '',
  guest_company TEXT DEFAULT '',
  
  -- 予約内容
  booking_type TEXT NOT NULL CHECK (booking_type IN ('online', 'in_person')),
  title TEXT NOT NULL DEFAULT '相談予約',
  description TEXT DEFAULT '',
  inquiry_type TEXT DEFAULT '' CHECK (inquiry_type IN (
    '', 'service', 'pricing', 'consultation', 'demo', 'other'
  )),
  
  -- 日時
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  timezone TEXT DEFAULT 'Asia/Tokyo',
  
  -- 場所・会議
  location TEXT DEFAULT '',                    -- 対面の場合の住所
  meeting_url TEXT DEFAULT '',                 -- Google Meet URL
  google_calendar_event_id TEXT DEFAULT '',    -- GCal イベントID
  
  -- 担当者
  assignee_id UUID REFERENCES users(id) ON DELETE SET NULL,  -- 担当営業
  
  -- ステータス
  status TEXT DEFAULT 'confirmed' CHECK (status IN (
    'pending', 'confirmed', 'cancelled', 'completed', 'no_show'
  )),
  cancelled_at TIMESTAMPTZ,
  cancel_reason TEXT DEFAULT '',
  completed_note TEXT DEFAULT '',              -- 相談後のメモ
  
  -- トラッキング
  source TEXT DEFAULT 'lp' CHECK (source IN ('lp', 'line', 'manual', 'other')),
  utm_source TEXT DEFAULT '',
  utm_medium TEXT DEFAULT '',
  utm_campaign TEXT DEFAULT '',
  
  -- メタ
  reminder_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_bookings_start ON crm_bookings(start_at);
CREATE INDEX IF NOT EXISTS idx_crm_bookings_assignee ON crm_bookings(assignee_id);
CREATE INDEX IF NOT EXISTS idx_crm_bookings_status ON crm_bookings(status);
CREATE INDEX IF NOT EXISTS idx_crm_bookings_contact ON crm_bookings(contact_id);
CREATE INDEX IF NOT EXISTS idx_crm_bookings_gcal ON crm_bookings(google_calendar_event_id)
  WHERE google_calendar_event_id != '';

ALTER TABLE crm_bookings ENABLE ROW LEVEL SECURITY;

-- 公開API（service_role）経由での作成を許可
CREATE POLICY "crm_bookings_public_insert" ON crm_bookings
  FOR INSERT WITH CHECK (true);  -- service_role client のみ使用

CREATE POLICY "crm_bookings_auth_select" ON crm_bookings
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "crm_bookings_auth_modify" ON crm_bookings
  FOR UPDATE TO authenticated USING (
    auth.uid() IN (
      SELECT id FROM users WHERE role IN ('admin', 'director')
    )
    OR assignee_id = auth.uid()
  );
```

### 20.4 予約枠管理

> **[A01 CRM Manager]** 予約枠は **管理画面の設定** から定義する。Google Calendar の空き時間を直接参照するのではなく、CRM側で「この曜日・時間帯は予約可能」を定義し、Google Calendar と突き合わせて最終的な空き枠を算出する。

```typescript
// CRM設定画面で管理（crm_booking_settings テーブル or app_settings に格納）

interface BookingSettings {
  // 予約枠の基本設定
  slotDuration: 30 | 60 | 90 | 120        // 分
  bufferTime: 0 | 15 | 30                  // 予約間のバッファ（分）
  maxAdvanceDays: number                    // 何日先まで予約可能（デフォルト: 30）
  minAdvanceHours: number                   // 最低何時間前まで予約可能（デフォルト: 24）
  
  // 営業時間（曜日別）
  availability: {
    [day: string]: {                        // 'monday' | 'tuesday' | ...
      enabled: boolean
      slots: { start: string; end: string }[]  // e.g. [{ start: '09:00', end: '12:00' }, { start: '13:00', end: '18:00' }]
    }
  }
  
  // 対面予約の場所選択肢
  locations: {
    id: string
    name: string                            // "東京オフィス" | "大阪オフィス"
    address: string
    maxCapacity?: number
  }[]
  
  // 担当者アサイン
  assigneeMode: 'round_robin' | 'manual' | 'specific'
  assigneeIds: string[]                     // 予約対応可能なメンバー
  
  // Google Calendar
  calendarId: string                        // 予約用カレンダーID
  
  // 通知
  confirmationEmailEnabled: boolean
  reminderEmailEnabled: boolean
  reminderHoursBefore: number               // デフォルト: 24
}
```

### 20.5 空き枠取得 API

```typescript
// GET /api/lp/booking/slots?date=2026-04-10&type=online
// 認証不要（公開エンドポイント）

interface SlotRequest {
  date: string                // yyyy-MM-dd
  booking_type: 'online' | 'in_person'
  location_id?: string        // in_person の場合
  timezone?: string           // デフォルト: Asia/Tokyo
}

interface SlotResponse {
  date: string
  slots: {
    start: string             // "09:00"
    end: string               // "10:00"
    available: boolean
    assignee_name?: string    // 公開名（オプション）
  }[]
}

// 空き枠算出ロジック:
// 1. BookingSettings から該当曜日の営業枠を取得
// 2. Google Calendar API で担当者全員の予定を取得（FreeBusy API）
// 3. crm_bookings テーブルから confirmed 予約を取得
// 4. 営業枠 - (GCal予定 ∪ 既存予約 ∪ バッファ) = 空き枠
// 5. minAdvanceHours チェック
```

> **[A06 Backend Engineer]** Google Calendar FreeBusy API を使えば、複数カレンダーの空き状況を1リクエストで取得可能。日単位でキャッシュ（5分TTL）してAPI呼び出しを最小化。

### 20.6 予約作成フロー

```
┌──────────────────────────────────────────────────────────────┐
│  LP 予約ページ (/lp/booking)                                  │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  Step 1: 相談方法を選択                                       │
│  ┌─────────────────┐  ┌─────────────────┐                    │
│  │ 💻 オンライン相談 │  │ 🏢 対面相談      │                    │
│  │ Google Meet     │  │ オフィスで対面   │                    │
│  └─────────────────┘  └─────────────────┘                    │
│                                                               │
│  Step 2: 日時を選択                                           │
│  ┌─────────────────────────────────────┐                     │
│  │  ◀  2026年4月  ▶                    │                     │
│  │  月  火  水  木  金  土  日          │                     │
│  │       1   2  [3]  4   -   -         │                     │
│  │   7   8   9  10  11   -   -         │                     │
│  │  ...                                │                     │
│  └─────────────────────────────────────┘                     │
│                                                               │
│  4月3日（木）の空き枠:                                        │
│  [09:00] [10:00] [11:00]  [13:00] [14:00] [15:00] [16:00]   │
│                                                               │
│  Step 3: (対面の場合) 場所を選択                              │
│  (○) 東京オフィス — 東京都千代田区...                         │
│  (○) 大阪オフィス — 大阪府大阪市...                          │
│                                                               │
│  Step 4: お客様情報                                           │
│  企業名    [                    ]                             │
│  お名前    [        ] [         ]                             │
│  メール    [                    ]                             │
│  電話番号  [                    ]                             │
│  ご相談内容 [                   ]                             │
│                                                               │
│  ☑ プライバシーポリシーに同意する                             │
│                                                               │
│  [       予約を確定する       ]                               │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

### 20.7 予約作成 API

```typescript
// POST /api/lp/booking
// 認証不要（公開エンドポイント）

interface BookingRequest {
  booking_type: 'online' | 'in_person'
  start_at: string            // ISO 8601
  end_at: string              // ISO 8601
  location_id?: string        // in_person の場合
  guest_name: string
  guest_email: string
  guest_phone?: string
  guest_company?: string
  inquiry_type?: string
  description?: string
  timezone?: string
  // UTM (auto-captured)
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  recaptcha_token: string
}

interface BookingResponse {
  success: boolean
  booking: {
    id: string
    start_at: string
    end_at: string
    booking_type: string
    meeting_url?: string      // online の場合
    location?: string         // in_person の場合
  }
}

// 処理フロー:
// 1. reCAPTCHA v3 検証
// 2. Zod バリデーション
// 3. 空き枠再チェック（楽観ロックではなく悲観ロック）
// 4. 担当者アサイン（round_robin or 指定）
// 5. crm_contacts UPSERT (email で重複チェック)
// 6. crm_leads INSERT (source: 'web_form')
// 7. crm_bookings INSERT
// 8. Google Calendar Event 作成
//    - online: conferenceDataVersion=1 で Google Meet 自動生成
//    - in_person: location に住所設定
// 9. crm_activities INSERT (type: 'meeting', scheduled_at)
// 10. 確認メール送信（予約者 + 担当者）
//     - online: Google Meet リンク含む
//     - in_person: 場所・地図リンク含む
// 11. booking.meeting_url / booking.location を返却
```

> **[A05 Software Engineer]** Google Calendar Event 作成時の Google Meet リンク自動生成:
> ```typescript
> const event = {
>   summary: `相談予約: ${guestName}様`,
>   start: { dateTime: startAt, timeZone: 'Asia/Tokyo' },
>   end: { dateTime: endAt, timeZone: 'Asia/Tokyo' },
>   attendees: [
>     { email: guestEmail },
>     { email: assigneeEmail }
>   ],
>   conferenceData: {
>     createRequest: {
>       requestId: bookingId,
>       conferenceSolutionKey: { type: 'hangoutsMeet' }
>     }
>   },
>   reminders: {
>     useDefault: false,
>     overrides: [
>       { method: 'email', minutes: 60 },
>       { method: 'popup', minutes: 15 }
>     ]
>   }
> }
> // conferenceDataVersion: 1 を指定して作成
> ```

### 20.8 予約キャンセル

```typescript
// POST /api/lp/booking/cancel
// 認証不要（トークンベース）

interface CancelRequest {
  booking_id: string
  cancel_token: string        // 予約確認メールに含まれるワンタイムトークン
  reason?: string
}

// フロー:
// 1. cancel_token 検証（HMAC-SHA256: booking_id + email + secret）
// 2. crm_bookings UPDATE (status → 'cancelled')
// 3. Google Calendar Event DELETE
// 4. crm_activities INSERT (type: 'system', subject: '予約キャンセル')
// 5. キャンセル確認メール送信
```

> **[A10 Security Engineer]** キャンセルトークンは HMAC-SHA256 で生成。`BOOKING_CANCEL_SECRET` 環境変数で署名。URL は `?id={bookingId}&token={hmac}` 形式で確認メールに含める。

### 20.9 CRM管理画面での予約管理

> **[A04 UI/UX Engineer]** CRMタブ内に「予約」サブタブを追加。

```
/crm?tab=bookings  → 予約一覧（カレンダービュー / リストビュー）
```

```
┌─────────────────────────────────────────────────────────────┐
│  Bookings  [カレンダー|リスト]  [フィルタ▾]                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌── 4月3日（木）──────────────────────────────────────┐     │
│  │ 09:00  💻 田中様（A社）— オンライン相談  [確定]      │     │
│  │ 10:00  ─── 空き ───                                 │     │
│  │ 11:00  🏢 鈴木様（B社）— 対面（東京）   [確定]      │     │
│  │ 13:00  💻 佐藤様（C社）— オンライン相談  [確定]      │     │
│  │ 14:00  ─── 空き ───                                 │     │
│  │ 15:00  💻 山田様      — オンライン相談  [キャンセル]  │     │
│  └─────────────────────────────────────────────────────┘     │
│                                                              │
│  クリック → サイドパネル:                                     │
│  ┌───────────────────────────────┐                          │
│  │ 田中太郎様 (A社)              │                          │
│  │ 📧 tanaka@a.com              │                          │
│  │ 📞 03-xxxx-xxxx              │                          │
│  │ 💻 オンライン / Google Meet   │                          │
│  │ 🔗 meet.google.com/xxx       │                          │
│  │ 📝 サービス詳細について相談   │                          │
│  │                               │                          │
│  │ [Meet参加] [コンタクト表示]    │                          │
│  │ [完了にする] [キャンセル]      │                          │
│  │                               │                          │
│  │ 相談メモ:                     │                          │
│  │ [                           ] │                          │
│  │ [保存]                        │                          │
│  └───────────────────────────────┘                          │
└─────────────────────────────────────────────────────────────┘
```

---

## 21. LINE 公式アカウント連携

### 21.1 概要

> **[A01 CRM Manager]** LINEは日本市場において最も重要なコミュニケーションチャネル。友だち追加→自動応答→予約誘導の流れを自動化し、CRMにリードとして取り込む。

> **[A07 Compatibility Engineer]** LINE Messaging API を使用。LINE Official Account Manager でアカウントを作成し、Webhook URL を設定する。認証済みアカウント（月額固定費あり）を推奨するが、未認証でも機能は同一。

### 21.2 LINE連携アーキテクチャ

```
┌──────────────────┐
│  LINE ユーザー    │
│  (スマートフォン)  │
└───────┬──────────┘
        │ メッセージ送信 / 友だち追加
        ▼
┌──────────────────┐
│  LINE Platform    │
│  Messaging API    │
└───────┬──────────┘
        │ Webhook POST (署名付き)
        ▼
┌──────────────────────────────────────────┐
│  /api/line/webhook                        │
│                                           │
│  1. 署名検証 (X-Line-Signature)           │
│  2. イベント振り分け:                      │
│     ├── follow      → 友だち追加処理       │
│     ├── message     → メッセージ処理       │
│     ├── postback    → ボタンアクション     │
│     └── unfollow    → ブロック処理         │
│                                           │
│  3. CRM 連携:                             │
│     ├── crm_contacts (LINE ID で管理)      │
│     ├── crm_leads (自動作成)               │
│     └── crm_activities (履歴記録)          │
│                                           │
│  4. 応答メッセージ送信 (Reply API)          │
└──────────────────────────────────────────┘
```

### 21.3 データベース拡張

```sql
-- crm_contacts テーブルに LINE 連携カラム追加
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS line_user_id TEXT DEFAULT '';
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS line_display_name TEXT DEFAULT '';
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS line_picture_url TEXT DEFAULT '';
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS line_status TEXT DEFAULT '' 
  CHECK (line_status IN ('', 'following', 'blocked'));

CREATE UNIQUE INDEX IF NOT EXISTS idx_crm_contacts_line 
  ON crm_contacts(line_user_id) WHERE line_user_id != '';

-- LINE メッセージ履歴（CRMアクティビティとは別に原本保持）
CREATE TABLE IF NOT EXISTS crm_line_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES crm_contacts(id) ON DELETE SET NULL,
  line_user_id TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('incoming', 'outgoing')),
  message_type TEXT NOT NULL CHECK (message_type IN (
    'text', 'image', 'video', 'audio', 'file', 'sticker',
    'template', 'flex', 'richmenu', 'postback'
  )),
  content TEXT DEFAULT '',                    -- テキスト内容
  media_url TEXT DEFAULT '',                  -- メディアURL
  line_message_id TEXT DEFAULT '',
  metadata JSONB DEFAULT '{}'::jsonb,         -- スタンプID等
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_line_messages_contact ON crm_line_messages(contact_id);
CREATE INDEX IF NOT EXISTS idx_crm_line_messages_user ON crm_line_messages(line_user_id);
CREATE INDEX IF NOT EXISTS idx_crm_line_messages_created ON crm_line_messages(created_at);

ALTER TABLE crm_line_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crm_line_messages_auth" ON crm_line_messages
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
```

### 21.4 Webhook 処理

```typescript
// POST /api/line/webhook

import crypto from 'crypto'

// 署名検証
function verifySignature(body: string, signature: string): boolean {
  const hash = crypto
    .createHmac('SHA256', process.env.LINE_CHANNEL_SECRET!)
    .update(body)
    .digest('base64')
  return hash === signature
}

// イベントハンドラ
interface LineWebhookEvent {
  type: 'follow' | 'unfollow' | 'message' | 'postback'
  replyToken: string
  source: { type: 'user'; userId: string }
  message?: { type: string; text?: string; id: string }
  postback?: { data: string }
  timestamp: number
}
```

#### 友だち追加（follow イベント）

```
フロー:
1. LINE Profile API でユーザー情報取得（displayName, pictureUrl）
2. crm_contacts UPSERT (line_user_id)
   - 既存メールコンタクトとの紐付け: 後述のメールアドレス取得フローで実施
3. crm_leads INSERT (source: 'social_media', status: 'new')
4. crm_activities INSERT (type: 'system', subject: 'LINE友だち追加')
5. ウェルカムメッセージ送信（Flex Message）:

┌─────────────────────────────┐
│  ご登録ありがとうございます！   │
│                              │
│  以下のメニューからお選び     │
│  ください:                   │
│                              │
│  [📅 相談を予約する]          │
│  [📋 サービス詳細を見る]      │
│  [💬 質問する]               │
│                              │
└─────────────────────────────┘
```

#### メッセージ受信（message イベント）

```
フロー:
1. crm_line_messages INSERT (direction: 'incoming')
2. crm_activities INSERT (type: 'system', subject: 'LINEメッセージ受信')
3. 自動応答の判定:
   a. キーワードマッチ:
      "予約" / "相談" → 予約リンク送信
      "料金" / "価格" → 料金案内メッセージ送信
      "資料" → 資料ダウンロードリンク送信
   b. マッチなし → デフォルトメッセージ + 担当者通知
4. CRM管理画面にリアルタイム通知（要返信フラグ）
```

#### postback アクション

```
"action=booking" → 予約ページURL送信（LINEブラウザで開く）
  URL: https://app.example.com/lp/booking?source=line&line_uid={userId}
  → 予約完了時に line_user_id と crm_bookings を紐付け

"action=contact" → 問い合わせフォームURL送信
"action=info"    → サービス情報の Flex Message 送信
```

### 21.5 リッチメニュー設計

> **[A04 UI/UX Engineer]** リッチメニューはLINE公式アカウントのトーク画面下部に常時表示。3〜6ボタン構成。

```
┌─────────────────────────────────────────┐
│  ┌───────────┐ ┌───────────┐ ┌────────┐│
│  │ 📅        │ │ 💬        │ │ 📋     ││
│  │ 相談予約   │ │ お問い合わせ│ │ サービス││
│  │           │ │           │ │ 紹介   ││
│  └───────────┘ └───────────┘ └────────┘│
│  ┌───────────┐ ┌───────────┐ ┌────────┐│
│  │ 📞        │ │ 🌐        │ │ ❓     ││
│  │ 電話する   │ │ Webサイト  │ │ FAQ    ││
│  │           │ │           │ │        ││
│  └───────────┘ └───────────┘ └────────┘│
└─────────────────────────────────────────┘
```

| ボタン | アクション | 種類 |
|--------|-----------|------|
| 相談予約 | `https://app.example.com/lp/booking?source=line` | URI |
| お問い合わせ | postback: `action=contact` | Postback |
| サービス紹介 | postback: `action=info` | Postback |
| 電話する | `tel:03-xxxx-xxxx` | URI |
| Webサイト | `https://www.example.com` | URI |
| FAQ | postback: `action=faq` | Postback |

### 21.6 CRM管理画面でのLINE管理

> **[A04 UI/UX Engineer]** コンタクト詳細画面にLINEタブを追加。LINE経由のコンタクトにはLINEアイコンバッジを表示。

```
/crm → コンタクト詳細 → [概要] [アクティビティ] [LINE] [ディール]

┌──────────────────────────────────────────┐
│  LINE チャット                    [LINE🟢]│
├──────────────────────────────────────────┤
│                                          │
│  3/25 14:30  ← 友だち追加               │
│  3/25 14:30  → ウェルカムメッセージ      │
│  3/25 14:35  ← "料金について教えて"      │
│  3/25 14:35  → [料金プラン Flex Message]  │
│  3/28 09:00  ← "相談したいです"          │
│  3/28 09:01  → "予約ページはこちら..."   │
│                                          │
│  ┌──────────────────────────────────┐    │
│  │ メッセージを入力...     [送信]    │    │
│  └──────────────────────────────────┘    │
│                                          │
│  [テンプレート▾]  [Flex Message▾]        │
│                                          │
└──────────────────────────────────────────┘
```

> **[A02 Sales Manager]** 営業担当者がCRM画面から直接LINEメッセージを送れるのは非常に強力。ただし Push API は月額プランのメッセージ数制限に注意。

> **[A01 CRM Manager]** LINE経由のコンタクトとメール経由のコンタクトを統合するフローが重要:
> 1. LINE友だち追加時: `line_user_id` でコンタクト作成
> 2. 予約フォームでメール入力時: `email` で既存コンタクトを検索 → マージ
> 3. 手動マージ: 管理画面でコンタクト統合操作

---

## 22. 型定義（追加分）

```typescript
// src/types/crm.ts に追加

// ---------------------------------------------------------------------------
// Booking Types
// ---------------------------------------------------------------------------

export type BookingType = 'online' | 'in_person'
export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show'
export type BookingSource = 'lp' | 'line' | 'manual' | 'other'

export interface CrmBooking {
  id: string
  contact_id: string | null
  lead_id: string | null
  guest_name: string
  guest_email: string
  guest_phone: string
  guest_company: string
  booking_type: BookingType
  title: string
  description: string
  inquiry_type: string
  start_at: string
  end_at: string
  timezone: string
  location: string
  meeting_url: string
  google_calendar_event_id: string
  assignee_id: string | null
  status: BookingStatus
  cancelled_at: string | null
  cancel_reason: string
  completed_note: string
  source: BookingSource
  utm_source: string
  utm_medium: string
  utm_campaign: string
  reminder_sent: boolean
  created_at: string
  updated_at: string
  // Relations
  contact?: Pick<CrmContact, 'id' | 'first_name' | 'last_name' | 'email'>
  assignee?: { id: string; name: string; avatar_color: string }
}

export interface BookingSlot {
  start: string
  end: string
  available: boolean
  assignee_name?: string
}

export interface BookingSettings {
  slotDuration: 30 | 60 | 90 | 120
  bufferTime: 0 | 15 | 30
  maxAdvanceDays: number
  minAdvanceHours: number
  availability: Record<string, {
    enabled: boolean
    slots: { start: string; end: string }[]
  }>
  locations: {
    id: string
    name: string
    address: string
    maxCapacity?: number
  }[]
  assigneeMode: 'round_robin' | 'manual' | 'specific'
  assigneeIds: string[]
  calendarId: string
  confirmationEmailEnabled: boolean
  reminderEmailEnabled: boolean
  reminderHoursBefore: number
}

// ---------------------------------------------------------------------------
// LINE Types
// ---------------------------------------------------------------------------

export type LineMessageDirection = 'incoming' | 'outgoing'
export type LineMessageType = 'text' | 'image' | 'video' | 'audio' | 'file' | 'sticker' | 'template' | 'flex' | 'richmenu' | 'postback'

export interface CrmLineMessage {
  id: string
  contact_id: string | null
  line_user_id: string
  direction: LineMessageDirection
  message_type: LineMessageType
  content: string
  media_url: string
  line_message_id: string
  metadata: Record<string, any>
  created_at: string
}

export interface LineWebhookEvent {
  type: 'follow' | 'unfollow' | 'message' | 'postback'
  replyToken: string
  source: { type: 'user'; userId: string }
  message?: { type: string; text?: string; id: string }
  postback?: { data: string }
  timestamp: number
}

// ---------------------------------------------------------------------------
// LP Form Types
// ---------------------------------------------------------------------------

export type InquiryType = 'service' | 'pricing' | 'consultation' | 'demo' | 'other'

export interface LPContactFormData {
  company_name: string
  first_name: string
  last_name: string
  email: string
  phone?: string
  inquiry_type: InquiryType
  message: string
  privacy_agreed: boolean
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_term?: string
  utm_content?: string
  referrer?: string
  landing_page?: string
}

// ---------------------------------------------------------------------------
// Extended CRM Dashboard (with booking/LINE metrics)
// ---------------------------------------------------------------------------

export interface CrmDashboardDataExtended extends CrmDashboardData {
  bookingsThisWeek: number
  bookingsCompleted: number
  bookingsNoShow: number
  lineFollowers: number
  lineNewThisMonth: number
  leadsBySource: { source: string; count: number }[]
}
```

---

## 23. コンポーネント設計（追加分）

```
src/
├── app/(public)/
│   ├── layout.tsx                        # 公開ページレイアウト
│   └── lp/
│       ├── page.tsx                      # メインLP
│       ├── booking/page.tsx              # 予約ページ
│       ├── booking-complete/page.tsx     # 予約完了
│       └── contact-complete/page.tsx     # 問い合わせ完了
├── components/
│   ├── lp/                               # LP専用コンポーネント
│   │   ├── LPLayout.tsx                  # LPレイアウト（ヘッダー/フッター）
│   │   ├── HeroSection.tsx               # ヒーローセクション
│   │   ├── FeatureSection.tsx            # サービス紹介
│   │   ├── TestimonialSection.tsx        # お客様の声
│   │   ├── ContactForm.tsx               # 問い合わせフォーム
│   │   ├── LineCtaSection.tsx            # LINE誘導セクション
│   │   └── PrivacyConsent.tsx            # 同意チェックボックス
│   ├── booking/                          # 予約コンポーネント
│   │   ├── BookingWizard.tsx             # 予約ステップウィザード
│   │   ├── BookingTypeSelector.tsx       # オンライン/対面選択
│   │   ├── BookingCalendar.tsx           # カレンダーUI
│   │   ├── BookingSlotPicker.tsx         # 時間枠選択
│   │   ├── BookingGuestForm.tsx          # ゲスト情報フォーム
│   │   ├── BookingConfirmation.tsx       # 確認画面
│   │   └── BookingManageList.tsx         # CRM側予約管理リスト
│   └── crm/
│       ├── line/                         # LINE関連
│       │   ├── LineChatPanel.tsx         # チャットUI
│       │   ├── LineMessageBubble.tsx     # メッセージバブル
│       │   ├── LineTemplateSelector.tsx  # テンプレート選択
│       │   └── LineContactBadge.tsx      # LINEバッジ
│       └── bookings/
│           ├── BookingCalendarView.tsx   # カレンダービュー
│           └── BookingListView.tsx       # リストビュー
├── hooks/
│   ├── useCrmBookings.ts
│   └── useCrmLine.ts
├── lib/
│   ├── data/
│   │   ├── crm-bookings.ts
│   │   └── crm-line.ts
│   ├── google-calendar/
│   │   ├── client.ts                    # Google Calendar API クライアント
│   │   ├── slots.ts                     # 空き枠算出ロジック
│   │   └── events.ts                    # イベント作成・更新・削除
│   ├── line/
│   │   ├── client.ts                    # LINE Messaging API クライアント
│   │   ├── webhook.ts                   # Webhook 署名検証・イベント処理
│   │   ├── messages.ts                  # メッセージテンプレート
│   │   └── rich-menu.ts                 # リッチメニュー管理
│   └── crm/
│       └── import-presets/
│           └── hubspot.ts               # 既存
└── app/api/
    ├── lp/
    │   ├── contact/route.ts
    │   └── booking/
    │       ├── route.ts
    │       ├── slots/route.ts
    │       └── cancel/route.ts
    └── line/
        └── webhook/route.ts
```

---

## 24. 環境変数（追加分）

```env
# Google Calendar API (Service Account)
GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"...","private_key":"..."}
GOOGLE_CALENDAR_ID=crm-bookings@company.com

# reCAPTCHA v3
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=6Le...
RECAPTCHA_SECRET_KEY=6Le...

# LINE Messaging API
LINE_CHANNEL_ACCESS_TOKEN=xxx
LINE_CHANNEL_SECRET=xxx

# Booking
BOOKING_CANCEL_SECRET=random-secret-for-hmac
```

> **[A12 DevOps Engineer]** すべて Vercel Environment Variables で管理。`GOOGLE_SERVICE_ACCOUNT_KEY` はJSON文字列なので改行をエスケープする必要がある。`LINE_CHANNEL_SECRET` はWebhook署名検証に使用。

---

## 25. i18n キー（追加分）

```typescript
// LP
'lp.hero.headline': 'ビジネスの成長を加速する' / 'Accelerate Your Business Growth'
'lp.hero.subheadline': '無料相談で最適なソリューションをご提案' / 'Get the Right Solution with a Free Consultation'
'lp.cta.booking': '無料相談を予約する' / 'Book a Free Consultation'
'lp.cta.contact': 'まずは問い合わせる' / 'Contact Us'
'lp.form.companyName': '企業名' / 'Company Name'
'lp.form.inquiryType': 'ご相談内容' / 'Inquiry Type'
'lp.form.message': 'メッセージ' / 'Message'
'lp.form.privacyAgree': 'プライバシーポリシーに同意する' / 'I agree to the Privacy Policy'
'lp.form.submit': '送信する' / 'Submit'
'lp.thanks.title': 'お問い合わせありがとうございます' / 'Thank You for Your Inquiry'
'lp.line.cta': 'LINEで相談する' / 'Chat on LINE'
'lp.line.addFriend': '友だち追加' / 'Add Friend'

// Booking
'booking.title': '相談予約' / 'Book a Consultation'
'booking.type.online': 'オンライン相談' / 'Online Consultation'
'booking.type.online.desc': 'Google Meetでビデオ通話' / 'Video call via Google Meet'
'booking.type.inPerson': '対面相談' / 'In-Person Meeting'
'booking.type.inPerson.desc': 'オフィスでお会いします' / 'Meet at our office'
'booking.selectDate': '日時を選択' / 'Select Date & Time'
'booking.selectLocation': '場所を選択' / 'Select Location'
'booking.guestInfo': 'お客様情報' / 'Your Information'
'booking.confirm': '予約を確定する' / 'Confirm Booking'
'booking.complete.title': 'ご予約ありがとうございます' / 'Booking Confirmed'
'booking.complete.meetLink': 'Google Meetリンク' / 'Google Meet Link'
'booking.complete.location': '場所' / 'Location'
'booking.cancel': '予約をキャンセル' / 'Cancel Booking'
'booking.status.pending': '確認中' / 'Pending'
'booking.status.confirmed': '確定' / 'Confirmed'
'booking.status.cancelled': 'キャンセル済' / 'Cancelled'
'booking.status.completed': '完了' / 'Completed'
'booking.status.noShow': '不参加' / 'No Show'

// LINE
'crm.line.chat': 'LINEチャット' / 'LINE Chat'
'crm.line.send': '送信' / 'Send'
'crm.line.template': 'テンプレート' / 'Template'
'crm.line.followers': 'フォロワー数' / 'Followers'
'crm.line.status.following': 'フォロー中' / 'Following'
'crm.line.status.blocked': 'ブロック' / 'Blocked'
```

---

## 26. テスト戦略（追加分）

> **[A09 QA Engineer]**

### E2Eシナリオ

| # | シナリオ | 概要 |
|---|---------|------|
| S27 | LP問い合わせ | フォーム入力→送信→CRMリード確認→確認メール |
| S28 | 予約フロー（オンライン） | 枠選択→情報入力→確定→Meet URL確認→CRM予約確認 |
| S29 | 予約フロー（対面） | 場所選択→枠選択→確定→場所情報確認 |
| S30 | 予約キャンセル | 確認メールのリンク→キャンセル→ステータス更新 |
| S31 | LINE Webhook | follow→メッセージ→postback→CRM反映 |
| S32 | LINE→予約統合 | LINE友だち追加→予約→コンタクト統合 |
| S33 | 予約枠管理 | 設定変更→空き枠反映→二重予約防止 |

### セキュリティテスト

| テスト | 検証内容 |
|--------|---------|
| Rate Limiting | 同一IP 6回目のフォーム送信がブロックされる |
| reCAPTCHA | スコア0.3以下でリジェクト |
| LINE署名 | 不正署名で401 |
| キャンセルトークン | 改ざんトークンで403 |
| XSS | フォーム入力のHTMLタグがサニタイズされる |
| CSRF | 外部オリジンからの直接POSTがブロックされる |

---

## 27. エージェント議論サマリー

### 主要論点と結論

> **[A01 CRM Manager]** (議長) 本セクションの議論を以下にまとめる。

#### 論点1: LPのホスティング場所

| 案 | 賛成 | 結論 |
|----|------|------|
| A. 本アプリ内 `(public)` ルート | A05, A06, A12, A15 | **採用** |
| B. 別プロジェクト（Vercel別デプロイ） | A04 | 将来的な分離に備えてコンポーネントは分離設計 |

> **[A05]** 同一プロジェクト内であればAPIルートの共有、型の共有、デプロイの一元化が可能。
> **[A04]** LPのデザインは管理画面と大きく異なるが、`(public)` レイアウトで分離すれば問題ない。CSSの衝突だけ注意。

#### 論点2: Google Calendar 認証方式

| 案 | 賛成 | 結論 |
|----|------|------|
| A. Service Account + Domain-Wide Delegation | A07, A10, A12 | **採用** |
| B. OAuth2 (管理者が手動認証) | — | トークンリフレッシュの運用負荷が高い |

> **[A07]** Service Account方式ならサーバーサイドで完結。トークン管理不要。
> **[A10]** Service Account キーの漏洩リスクに注意。Vercel環境変数で厳格管理。

#### 論点3: LINE連携の範囲

| 案 | 賛成 | 結論 |
|----|------|------|
| A. Webhook受信 + 自動応答 + Push送信（管理画面から） | 全員 | **採用** |
| B. A + LINE Login (認証連携) | A10, A07 | Phase 2 |
| C. A + B + LINE Pay | — | スコープ外 |

> **[A02]** 営業がCRM画面からLINEメッセージを送れるだけで十分な価値がある。
> **[A10]** LINE Login はメールアドレスとの紐付けに有効だが、MVPでは手動マージで十分。
> **[A13]** Phase 2 で LINE Login を追加し、コンタクト自動マージを実現する。

#### 論点4: 予約の担当者アサイン方式

| 案 | 賛成 | 結論 |
|----|------|------|
| A. ラウンドロビン（自動均等分配） | A02, A01 | **デフォルト採用** |
| B. 手動（管理者が後からアサイン） | A03 | オプションとして提供 |
| C. スキルベース（相談内容でマッチ） | A14 | Phase 2 |

> **[A02]** 最初はラウンドロビンで回し、データが溜まったらスキルベースに進化させる。
> **[A06]** ラウンドロビンは `crm_bookings` の直近アサイン数でカウントし、最少アサインのメンバーに割り当て。

#### 論点5: LP→LINE→予約のコンタクト統合

> **[A01]** 同一人物が LP フォーム（メール）→ LINE 友だち追加 → 予約 と複数チャネルから来た場合のマージ方針:

```
統合ルール:
1. email 一致 → 自動マージ
2. line_user_id + 予約フォームのemail → 自動マージ
3. 名前一致 + 企業一致 → サジェスト（手動確認）
4. それ以外 → 別コンタクトとして管理（手動マージ可能）
```

> **[A09]** マージのエッジケース（一方にしかないフィールド、両方にある場合の優先度）はユニットテストで網羅する。

---

## 28. 追加パッケージ

| パッケージ | 用途 | サイズ |
|-----------|------|--------|
| `googleapis` | Google Calendar API | ~2MB |
| `@line/bot-sdk` | LINE Messaging API | ~200KB |
| `react-google-recaptcha-v3` | reCAPTCHA v3 | ~15KB |
| `encoding-japanese` | Shift_JIS対応（エクスポート） | ~200KB |

> **[A05]** `googleapis` は大きいが、Tree-shakingで Calendar API 部分のみバンドル。サーバーサイドのみなのでクライアントバンドルには影響なし。

---

## 29. ロードマップ更新

### Phase 1 改訂（5 → 7 スプリント）

| Sprint | 内容 |
|--------|------|
| Sprint 1 | DB マイグレーション（CRM Core + Bookings + LINE） |
| Sprint 2 | コンタクト・企業・リード・ディール CRUD |
| Sprint 3 | ディールカンバン + リード変換 |
| Sprint 4 | LP + 問い合わせフォーム + reCAPTCHA |
| Sprint 5 | 予約システム + Google Calendar連携 |
| Sprint 6 | LINE Webhook + 自動応答 + CRM管理画面LINE機能 |
| Sprint 7 | インポート/エクスポート + ダッシュボードKPI + テスト |

---

## 30. 未決定事項 (Open Questions) — 更新

| # | 質問 | 担当 | 期限 |
|---|------|------|------|
| OQ-1 | `sales` ロールを正式追加するか、名前ベースホワイトリストで継続か | A10 + Product Owner | Sprint 1 前 |
| OQ-2 | Pipeline機能をCRMに統合するか、並行運用するか | A15 + A01 | Phase 1 完了後 |
| OQ-3 | HubSpot OAuth直接連携（API経由）は Phase 2 か Phase 3 か | A07 | Phase 1 完了後 |
| OQ-4 | kintoneインポートのフィールド構造調査 | A07 | Sprint 7 前 |
| OQ-5 | カンバンのD&Dライブラリ: `@dnd-kit` vs `react-beautiful-dnd` | A05 | Sprint 3 前 |
| OQ-6 | Google Workspace ドメイン委任の設定手順と承認フロー | A12 + A07 | Sprint 5 前 |
| OQ-7 | LINE公式アカウントのプラン選定（フリー/ライト/スタンダード）| A01 + A13 | Sprint 6 前 |
| OQ-8 | LP のドメイン（サブディレクトリ `/lp` vs サブドメイン `lp.example.com`） | A12 + A04 | Sprint 4 前 |
| OQ-9 | reCAPTCHA v3 の代替（Cloudflare Turnstile）検討 | A10 | Sprint 4 前 |
| OQ-10 | 予約リマインダーの送信方法（メール / LINE / 両方） | A01 + A14 | Sprint 5 前 |

---

*本仕様書（Part I + Part II）は15エージェントの合議により策定されました。実装フェーズで追加の判断が必要な場合は、該当エージェントの観点を参照してください。*
