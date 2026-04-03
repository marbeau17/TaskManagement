# モンキーテスト仕様書 — WorkFlow タスク管理 + CRM

**作成日**: 2026-04-03
**対象**: 全機能の安定性・エラーハンドリング検証

---

## 1. テスト対象ページ

| # | ページ | URL | テスト内容 |
|---|--------|-----|-----------|
| 1 | ログイン | /login | 不正認証、空入力、SQL injection |
| 2 | ダッシュボード | /dashboard | 高速タブ切替、期間切替 |
| 3 | マイページ | /mypage | データ0件表示、高速リロード |
| 4 | タスク一覧 | /tasks | フィルタ連打、ソート切替、ページネーション |
| 5 | タスク詳細 | /tasks/[id] | 存在しないID、不正ステータス遷移 |
| 6 | 課題管理 | /issues | CSVエクスポート、フィルタ組み合わせ |
| 7 | ワークロード | /workload | 期間切替、メンバー切替 |
| 8 | パイプライン | /pipeline | インライン編集、ステータス変更 |
| 9 | CRM ダッシュボード | /crm | タブ高速切替 |
| 10 | CRM コンタクト | /crm?tab=contacts | ソート、フィルタ、インポート、エクスポート |
| 11 | CRM 企業 | /crm?tab=companies | CRUD操作 |
| 12 | CRM リード | /crm?tab=leads | 変換操作 |
| 13 | CRM ディール | /crm?tab=deals | カンバンD&D、リスト/カンバン切替 |
| 14 | CRM フォーム | /crm?tab=forms | フォーム作成、プレビュー、埋め込みコード |
| 15 | CRM キャンペーン | /crm?tab=campaigns | 作成、配信 |
| 16 | ニュース | /news | 記事作成、カテゴリタブ |
| 17 | プロフィール | /profile | テーマ切替、カラーテーマ切替 |
| 18 | メンバー | /members | 権限チェック（非admin） |
| 19 | 設定 | /settings | 設定変更 |

## 2. API エンドポイントテスト

| # | エンドポイント | テスト |
|---|--------------|-------|
| 1 | GET /api/crm/companies | 正常応答 |
| 2 | GET /api/crm/contacts | 正常応答 |
| 3 | GET /api/crm/leads | 正常応答 |
| 4 | GET /api/crm/deals | 正常応答 |
| 5 | GET /api/crm/deals/summary | KPIデータ |
| 6 | GET /api/crm/search?q=test | 検索応答 |
| 7 | GET /api/crm/forms | フォーム一覧 |
| 8 | GET /api/crm/campaigns | キャンペーン一覧 |
| 9 | GET /api/crm/activities | アクティビティ |
| 10 | GET /api/news | ニュース一覧 |
| 11 | GET /api/mypage | マイページデータ |
| 12 | POST /api/crm/forms/invalid-id/submit | 不正ID |
| 13 | POST with empty body | エラーハンドリング |
| 14 | GET with XSS query | サニタイズ |
| 15 | Concurrent requests (10x) | 安定性 |

## 3. モンキーテストシナリオ

### M1: 高速ナビゲーション
全ページを0.5秒間隔で巡回。クラッシュしないこと。

### M2: 不正入力
全フォームに `<script>alert(1)</script>`, 空文字, 1000文字, 特殊文字を入力。

### M3: 並行操作
3つのブラウザタブで同時にCRMデータを編集。

### M4: ブラウザ操作
戻る/進むボタン20回連打。ページリロード10回。

### M5: レスポンシブ
320px / 768px / 1024px / 1920px でCRM全タブ表示。

### M6: ダークモード
全CRMコンポーネントのダークモード表示確認。

### M7: 大量データ
100件のコンタクトをインポート後のページネーション動作。

### M8: 権限
非adminでCRM/Pipeline/Members直接アクセス。

## 4. 合否基準

- 全ページが200/307を返すこと
- JavaScriptエラーがコンソールに出ないこと
- APIが適切なステータスコードを返すこと
- 不正入力でクラッシュしないこと
