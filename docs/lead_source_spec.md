# 流入経路 (Lead Source) 仕様書

**作成日**: 2026-05-13
**ステータス**: ドラフト → 実装中
**スコープ**: CRM のコンタクト・リード・会社・フォーム送信に対する流入経路の構造化 + AI 経営診断のチャネル別フィルタ + 診断結果のシェアリンク

---

## 1. 背景と問題

現状、流入経路は `crm_contacts.source` / `crm_leads.source` / `crm_companies.source` の **単一の自由文字列カラム** に保存されている (例: `hearing_form`, `web_form`, `pipeline`, `referral`)。

これによる課題:

| 問題 | 影響 |
|---|---|
| 表記揺れ | `hearing_form` / `web_form` / `form` が混在 → 集計不可 |
| 階層構造の欠如 | 「広告」「SNS」など上位カテゴリで分析できない |
| UTM の保存先がない | フォーム送信時に `utm_source/medium/campaign` を受け取っているが contact/lead に転記されない |
| Referrer の欠如 | 直接流入 / 検索 / 紹介の区別ができない |
| 重複時の上書き | 2 回目の問い合わせで初回ソースが消える |

## 2. タクソノミー (12 チャネル)

業界標準 (HubSpot / Salesforce / GA4) を踏まえつつ Meets Consulting の販路に合わせて 12 個に正規化する。

| `source_channel` | 表示名 | 該当する `source_detail` の例 | 主な検出根拠 |
|---|---|---|---|
| `organic_search` | 自然検索 | google, yahoo, bing | utm_medium=organic / Referrer が検索エンジン |
| `paid_search` | 検索広告 | google_ads, yahoo_ads | utm_medium=cpc/ppc |
| `paid_social` | SNS 広告 | facebook_ads, instagram_ads, line_ads | utm_medium=paid_social |
| `social` | SNS (自然) | x, facebook, instagram, line_official, tiktok | Referrer が SNS ドメイン / utm_source=line |
| `direct` | 直接流入 | (空) | UTM なし & Referrer 無し |
| `referral` | 他サイト紹介 | partner_name, blog_url | 上記以外の Referrer |
| `email` | メール | newsletter, drip, cold_email | utm_medium=email |
| `form` | 自社フォーム | hearing_form, contact_form, document_request, line_inquiry | 内部フォーム送信 (本仕様で新設) |
| `event` | イベント・展示会 | seminar_2026_05, expo_tokyo, webinar_xyz | utm_medium=event / 手動入力 |
| `partner` | 提携パートナー | kiraboshi_bank, ms_japan, samurai_inc | 既存顧客紹介プログラム / 銀行・士業ルート |
| `outbound` | アウトバウンド営業 | cold_call, cold_email_outreach, dm | 担当者が手動で記録 |
| `other` | その他 | 不明 / 未分類 | 上記いずれも該当しない |

**設計原則**:
- `source_channel` は **固定 enum** (DB は TEXT だがアプリ層で 12 値に制限)
- `source_detail` は **自由文字列** (細分化用 / レポートでドリルダウン用途)
- 表記ゆれを避けるため CRM UI ではプルダウンから選択

## 3. 検出ロジック (resolver)

入力: `{ utm_source, utm_medium, utm_campaign, referrer, landing_url, form_kind }`

出力: `{ channel, detail }`

### 優先順位 (上から評価)

1. **明示的なフォーム送信** → `form` チャネル
   - `form_kind === 'hearing_form'` → `{ channel: 'form', detail: 'hearing_form' }`
   - `form_kind === 'contact_form'` → `{ channel: 'form', detail: 'contact_form' }`
   - etc.

2. **UTM パラメータ**:
   - `utm_medium=cpc|ppc|paid_search` → `paid_search`, detail = utm_source
   - `utm_medium=paid_social|cpc_social` → `paid_social`, detail = utm_source
   - `utm_medium=email|newsletter` → `email`, detail = utm_campaign || utm_source
   - `utm_medium=event|webinar` → `event`, detail = utm_campaign
   - `utm_medium=referral` → `referral`, detail = utm_source
   - `utm_source=line|line_official` → `social`, detail = `line`
   - `utm_medium=organic` → `organic_search`, detail = utm_source

3. **Referrer 解析** (UTM 無しの場合):
   - 検索エンジン (google.*, yahoo.*, bing.*, duckduckgo.*) → `organic_search`
   - SNS (x.com, twitter.com, facebook.com, instagram.com, line.me, lin.ee, tiktok.com, linkedin.com) → `social`
   - 自社ドメイン (meetsc.co.jp, portal.meetsc.co.jp) → 内部遷移、無視
   - 上記以外 → `referral`, detail = ホスト名

4. **Referrer も UTM も無い** → `direct`

5. **手動入力 (CRM UI 上の作成画面)** → ユーザーがプルダウンで指定

## 4. DB スキーマ

`crm_contacts` / `crm_leads` に下記カラムを追加 (`crm_companies` は contact から導出可能だが、初回流入の attribution 用に同じ列を持つ):

| カラム | 型 | 説明 |
|---|---|---|
| `source_channel` | TEXT | 12 チャネルのいずれか (NULL = 未分類) |
| `source_detail` | TEXT | 細分化キー (例: google_ads) |
| `first_utm_source` | TEXT | 初回流入時の UTM (上書き禁止) |
| `first_utm_medium` | TEXT | 同上 |
| `first_utm_campaign` | TEXT | 同上 |
| `first_referrer_url` | TEXT | 初回 Referrer |
| `first_landing_url` | TEXT | 初回ランディングページ |
| `first_seen_at` | TIMESTAMPTZ | 初回流入日時 |

**重要原則**:
- `first_*` 系は **初回値を保持**。同一メールが 2 回目以降に問い合わせても上書きしない。
- `source_channel` / `source_detail` も **デフォルトは初回保持**。手動で更新する場合のみ後から変えられる。

既存の `source` カラムは互換性のため残す (アプリ層で参照しない/書き込まない)。

## 5. フォーム送信時の挙動

`/api/form/submit` (経営相談ヒアリング) と `/api/crm/forms/[id]/submit` (汎用 CRM フォーム) の両方で:

1. リクエストボディから `utm_source`, `utm_medium`, `utm_campaign`, `_source_url` (Referrer), `_landing_url` を取り出す
2. `resolveSource()` を呼んで `{ channel, detail }` を導出
3. `crm_contacts` / `crm_leads` / `crm_companies` の insert/update 時に
   - **新規** → `source_channel`, `source_detail`, `first_utm_*`, `first_referrer_url`, `first_landing_url`, `first_seen_at` を全部セット
   - **既存** → `first_*` 系は触らない。`source_channel` / `source_detail` も既存値を保持

## 6. AI 経営診断: 流入経路フィルタ + ソート

`CrmAiDiagnosis.tsx` のリードリストに以下を追加:

- **チャネルフィルタチップ**: `すべて / form / social / paid_search / organic_search / referral / event / partner / outbound / direct / other` (該当ゼロのチャネルは非表示)
- **ソート**:
  - **流入経路 (channel 名のアルファベット順)**
  - **最新診断日時 (新しい順 / 古い順)**

リードカードに `source_channel` のバッジを追加 (色分けはタクソノミー表のチャネルに応じて固定パレット)。

## 7. AI 経営診断: シェアリンク

**目的**: 社内メンバーに「このリードの診断結果を見て」と URL を送れる。

**設計**:
- URL 形式: `https://portal.meetsc.co.jp/crm?tab=diagnosis&leadId={uuid}&diagnosisId={uuid}`
- `diagnosisId` 省略時は最新の世代を表示
- `CrmAiDiagnosis` がマウント時に `useSearchParams()` から `leadId` / `diagnosisId` を読む
- 対応するリードを自動選択、対応する世代を自動的にアクティブに
- ヘッダー右に「🔗 リンクをコピー」ボタンを追加、現在表示中の `leadId` + `diagnosisId` でクリップボードへコピー
- 認証必須 (社内メンバー前提)。RLS で `authenticated` ロールに `SELECT` 許可済み。

## 8. 受け入れ基準

実装後、以下が成立すること:

- [ ] `/docs/lead_source_spec.md` が存在し、本仕様書と一致する (Planner / Change Request)
- [ ] migration 068 が DB に適用されている (`source_channel` カラム存在)
- [ ] `/lib/crm/source-resolver.ts` の unit-level 動作確認: 8 ケース (UTM 各種 + Referrer 各種 + form_kind) で期待通りの `{channel, detail}` を返す
- [ ] `/api/form/submit` に新規送信すると、`crm_contacts.source_channel='form'` + `source_detail='hearing_form'` が記録される
- [ ] 既存の 4 件のヒアリングリードに対し backfill スクリプトで `source_channel='form'` が設定されている
- [ ] AI 経営診断画面でチャネルフィルタが動き、リードが絞り込まれる
- [ ] AI 経営診断画面で「リンクをコピー」を押すと `?tab=diagnosis&leadId=...&diagnosisId=...` がクリップボードに入り、別タブで開くとそのリードのその世代の診断が表示される
