# 課題改善・国際化・設定外出し 仕様書

**作成日**: 2026-03-26

---

## 1. 課題機能の改善

### 1.1 課題番号の自動付与
- 課題作成時に `{PROJECT_PREFIX}-{SEQ}` 形式で自動採番（例: WEB-3, EC-2）
- projects テーブルの `next_issue_seq` をアトミックにインクリメント
- 課題一覧・詳細・カードに issue_key を目立つ位置に表示

### 1.2 タスク名選択
- 課題作成フォームで「関連タスク」をドロップダウンから選択可能に
- プロジェクト選択後、そのプロジェクトに属するタスクのみ表示
- 自由テキストでの検索フィルタ付き

### 1.3 課題CSV出力
- 課題一覧ページに「CSV出力」ボタン追加
- 出力カラム: issue_key, type, severity, status, title, assignee, project, created_at, resolved_at
- BOM付きUTF-8（Excel互換）

---

## 2. ダッシュボード: プロジェクト別OPEN課題数

### 2.1 表示場所
- ダッシュボードにプロジェクト課題サマリーカードを追加
- 各プロジェクト: 名前, OPEN課題数, Critical数, High数
- 色分け: Critical=赤バッジ, High=オレンジバッジ

---

## 3. 国際化（i18n）

### 3.1 概要
- 日本語/英語の2言語対応
- ブラウザの `navigator.language` で自動判定
- 手動切替ボタン（JP/EN トグル）
- Gemini AI APIで動的翻訳（UIラベルは静的辞書、ユーザーコンテンツは動的翻訳）

### 3.2 静的UIラベル辞書
```typescript
// src/lib/i18n/translations.ts
const translations = {
  ja: {
    'nav.dashboard': 'ダッシュボード',
    'nav.tasks': 'タスク一覧',
    'nav.issues': '課題管理',
    // ... 全UIラベル
  },
  en: {
    'nav.dashboard': 'Dashboard',
    'nav.tasks': 'Task List',
    'nav.issues': 'Issue Tracker',
    // ...
  }
}
```

### 3.3 動的翻訳（Gemini AI）
- ユーザーが入力したコンテンツ（タスク名、説明、コメント等）を翻訳
- 翻訳ボタン（🌐）をテキスト表示箇所に配置
- クリックでGemini APIを呼び出し、翻訳結果をインラインで表示
- API Route: `/api/translate` → Gemini AI

### 3.4 言語切替UI
- サイドバー下部またはTopbarに `JP | EN` トグルボタン
- 設定ページにも言語設定セクション
- ローカルストレージに永続化

### 3.5 Gemini AI設定
- APIキーは環境変数 `GEMINI_API_KEY` で管理
- 設定画面でAPIキーを設定可能（暗号化してDBに保存、またはVercel env var）

---

## 4. 設定画面の外出し

### 4.1 設定画面の構造
```
/settings
  ├── 一般設定（組織名、テーマ）
  ├── 稼働管理設定（しきい値）
  ├── 通知設定
  ├── 言語設定（JP/EN切替、自動検出ON/OFF）
  └── AI設定（Gemini APIキー）
```

### 4.2 設定の保存先
- テーマ: localStorage（クライアント）
- 言語: localStorage（クライアント）
- APIキー: Supabase `app_settings` テーブル（サーバー）
- 稼働しきい値: Supabase `app_settings` テーブル

### 4.3 app_settings テーブル
```sql
CREATE TABLE app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);
```
