# 残存Issue仕様書 — WorkFlow タスク管理ツール

**作成日**: 2026-04-02
**対象Issue**: WEB,-14 / WEB,-2 / WEB-1
**レビュー方式**: 20エージェント合議制

---

## 0. エージェントレビューボード

| # | エージェント | 担当領域 |
|---|-------------|----------|
| A01 | **Product Owner** | スコープ・優先度・ユーザー価値 |
| A02 | **UI/UX Designer** | ビジュアル設計・カラーシステム・レスポンシブ |
| A03 | **Frontend Engineer** | React/CSS実装・テーマシステム |
| A04 | **Backend Engineer** | DB・API・設定永続化 |
| A05 | **CSS Architect** | デザイントークン・CSS変数・ダークモード |
| A06 | **Mobile Specialist** | iPhone SE対応・タッチUI・ビューポート |
| A07 | **Accessibility Engineer** | コントラスト比・WCAG準拠 |
| A08 | **QA Engineer** | テスト戦略・回帰テスト |
| A09 | **i18n Engineer** | 翻訳キー・多言語UI |
| A10 | **Security Engineer** | XSS・設定改ざん防止 |
| A11 | **Performance Engineer** | CSS変数切替のパフォーマンス |
| A12 | **Brand Manager** | コーポレートカラー・ブランドガイドライン |
| A13 | **DevOps Engineer** | デプロイ・環境変数 |
| A14 | **Template Architect** | テンプレートシステム設計 |
| A15 | **Form Engineer** | フォームUI・バリデーション |
| A16 | **Data Analyst** | テンプレート利用状況・分析 |
| A17 | **Customer Success** | ユーザーオンボーディング・ヘルプ |
| A18 | **Integration Architect** | 既存機能との整合性 |
| A19 | **Tech Lead** | 実装方針・リスク評価 |
| A20 | **Compatibility Engineer** | ブラウザ互換・デバイス対応 |

---

# Issue 1: WEB,-14 — ユーザー選択可能カラーテーマ

## 1.1 概要

> **[A01 Product Owner]** 元の要望はMeetsカラー（Blue: #1a2d51, Gold: #c5a059）への変更だが、ユーザーが設定画面からテーマカラーを選択できるようにスコープを拡張する。ハードコードではなく、複数テーマをプリセットとして提供。

> **[A12 Brand Manager]** Meetsブランドカラーをデフォルトとし、他のテーマも選択可能にすることでマルチテナント利用にも対応できる。

## 1.2 テーマプリセット

> **[A02 UI/UX Designer]** + **[A05 CSS Architect]**

| テーマ名 | Primary | Primary Dark | Primary Light | Accent | 用途 |
|---------|---------|-------------|--------------|--------|------|
| **Meets** (default) | `#1a2d51` | `#0f1b33` | `#2a4575` | `#c5a059` | コーポレートカラー |
| **Mint** (現行) | `#6FB5A3` | `#2E6B5A` | `#A8D5CA` | `#C8A030` | 現行デザイン互換 |
| **Ocean** | `#1e6091` | `#0d3d5c` | `#3a8bc2` | `#e8a838` | 青系バリエーション |
| **Forest** | `#2d6a4f` | `#1b4332` | `#52b788` | `#d4a373` | 緑系 |
| **Slate** | `#475569` | `#1e293b` | `#94a3b8` | `#f59e0b` | モノトーン系 |

> **[A07 Accessibility Engineer]** 全テーマでWCAG AA (4.5:1) コントラスト比を保証。白テキストとの組み合わせで最低コントラスト比をプリセット定義時に検証する。

> **[A05 CSS Architect]** CSS Custom Properties でテーマを実装。既存の `--color-mint-*` 変数を汎用名 `--color-primary-*` に移行し、テーマ切替時にルート変数を差し替える。

## 1.3 技術設計

### 1.3.1 CSS変数アーキテクチャ

```css
/* globals.css — テーマ中立の変数名に移行 */
:root {
  /* Primary (テーマで変わる) */
  --color-primary: var(--theme-primary, #1a2d51);
  --color-primary-d: var(--theme-primary-d, #0f1b33);
  --color-primary-dd: var(--theme-primary-dd, #0a1223);
  --color-primary-l: var(--theme-primary-l, #2a4575);
  --color-primary-ll: var(--theme-primary-ll, #3d5a8a);
  --color-accent: var(--theme-accent, #c5a059);
  
  /* 既存mint変数はprimaryのエイリアスとして維持（互換性） */
  --color-mint: var(--color-primary);
  --color-mint-d: var(--color-primary-d);
  --color-mint-dd: var(--color-primary-dd);
  --color-mint-l: var(--color-primary-l);
  --color-mint-ll: var(--color-primary-ll);
}

/* テーマプリセット */
[data-theme="meets"] {
  --theme-primary: #1a2d51;
  --theme-primary-d: #0f1b33;
  --theme-primary-dd: #0a1223;
  --theme-primary-l: #2a4575;
  --theme-primary-ll: #3d5a8a;
  --theme-accent: #c5a059;
}

[data-theme="mint"] {
  --theme-primary: #6FB5A3;
  --theme-primary-d: #4A9482;
  --theme-primary-dd: #2E6B5A;
  --theme-primary-l: #A8D5CA;
  --theme-primary-ll: #E2F2EE;
  --theme-accent: #C8A030;
}
/* ... 他テーマも同様 */
```

> **[A03 Frontend Engineer]** `--color-mint-*` をエイリアスとして維持することで、既存の84ファイルのクラス名（`bg-mint-dd`, `text-mint` 等）を一切変更せずにテーマ切替を実現できる。

> **[A11 Performance Engineer]** CSS変数のランタイム切替はリペイントのみでリフローなし。パフォーマンス影響は無視できるレベル。

### 1.3.2 設定UI

```
/settings → 外観セクション（既存のテーマ light/dark/system と同じ場所）

┌─────────────────────────────────────────────┐
│  外観設定                                    │
│                                              │
│  テーマ: ☀ ライト / 🌙 ダーク / 💻 システム  │  ← 既存
│                                              │
│  カラーテーマ:                                │  ← NEW
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐
│  │██████│ │██████│ │██████│ │██████│ │██████│
│  │Meets │ │ Mint │ │Ocean │ │Forest│ │Slate │
│  │  ✓   │ │      │ │      │ │      │ │      │
│  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘
│                                              │
│  言語: 🇯🇵 日本語 / 🇺🇸 English              │  ← 既存
└─────────────────────────────────────────────┘
```

> **[A02 UI/UX Designer]** カラーテーマは円形またはカード型のプレビューで視覚的に選択。選択即反映（保存ボタン不要）。サイドバーの色が即座に変わるのでフィードバックが明確。

### 1.3.3 永続化

| 方法 | 保存先 | 理由 |
|------|--------|------|
| クライアント | `localStorage('workflow-color-theme')` | 即座に読み取り、初期フラッシュ防止 |
| サーバー (任意) | `users.preferences` JSONB | デバイス間同期（Phase 2） |

> **[A04 Backend Engineer]** Phase 1 は localStorage のみで十分。Phase 2 でユーザーテーブルに `preferences JSONB` カラムを追加してデバイス間同期。

> **[A19 Tech Lead]** 初期ロード時のフラッシュ防止は、既存のダークモード防止スクリプト（`layout.tsx` の `<script>` タグ）にテーマ読み取りを追加。

```typescript
// layout.tsx の既存スクリプトに追加
(function() {
  try {
    var theme = localStorage.getItem('workflow-theme') || 'system';
    var colorTheme = localStorage.getItem('workflow-color-theme') || 'meets';
    document.documentElement.setAttribute('data-theme', colorTheme);
    // ... 既存のダークモードロジック
  } catch(e) {}
})();
```

### 1.3.4 Zustand Store 拡張

```typescript
// src/stores/uiStore.ts に追加
interface UiState {
  // ... 既存
  colorTheme: string  // NEW
  setColorTheme: (theme: string) => void  // NEW
}
```

### 1.3.5 管理者によるデフォルトテーマ設定

> **[A01 Product Owner]** 管理者が `/settings` で組織全体のデフォルトテーマを設定できるようにする。個人設定がない場合にこのデフォルトが適用される。

```
/settings → アプリ設定（admin only）
  デフォルトカラーテーマ: [Meets ▾]
```

> **[A04 Backend Engineer]** `app_settings` テーブルに `key='default_color_theme'` で保存。既存のapp_settings APIを再利用。

### 1.3.6 影響範囲

> **[A18 Integration Architect]** 既存コード変更は最小限:

| 変更 | ファイル | 内容 |
|------|---------|------|
| CSS変数追加 | `globals.css` | テーマプリセット定義 + エイリアス |
| 初期ロード | `layout.tsx` | スクリプトにcolorTheme読み取り追加 |
| Store | `uiStore.ts` | colorTheme state追加 |
| 設定UI | `profile/page.tsx` | カラーテーマセレクター追加 |
| Admin設定 | `settings/page.tsx` | デフォルトテーマ設定 |

**変更しないファイル:** コンポーネント84ファイルの `bg-mint-*` クラス名は一切変更不要（CSS変数エイリアスで吸収）。

### 1.3.7 i18n

```
'settings.colorTheme': 'カラーテーマ' / 'Color Theme'
'settings.colorTheme.meets': 'Meets' / 'Meets'
'settings.colorTheme.mint': 'ミント' / 'Mint'
'settings.colorTheme.ocean': 'オーシャン' / 'Ocean'
'settings.colorTheme.forest': 'フォレスト' / 'Forest'
'settings.colorTheme.slate': 'スレート' / 'Slate'
```

### 1.3.8 実装見積

| Step | 内容 | 時間 |
|------|------|------|
| 1 | globals.css テーマプリセット + エイリアス | 1h |
| 2 | layout.tsx 初期ロードスクリプト | 0.5h |
| 3 | uiStore colorTheme state | 0.5h |
| 4 | プロフィールページ カラーセレクター | 1.5h |
| 5 | Admin設定 デフォルトテーマ | 1h |
| 6 | ダークモード × テーマ組み合わせ検証 | 1h |
| 7 | テスト | 1h |
| **合計** | | **6.5h** |

---

# Issue 2: WEB,-2 — タスク依頼テンプレート「商品画像作成」追加

## 2.1 概要

> **[A01 Product Owner]** EC事業部からの要望。商品画像作成のタスク依頼を定型化し、必要情報（プラットフォーム、枚数）の入力漏れを防ぐ。

> **[A14 Template Architect]** 既存テンプレートシステムはUI管理画面（`/templates`）からフィールドを追加できる。しかし「ボタン選択」型のフィールドタイプがまだない。`select` はドロップダウンのみ。

## 2.2 要件

```
テンプレート名: 商品画像作成
フィールド:
  1. プラットフォーム（必須）
     - タイプ: ボタングループ（複数選択可）
     - 選択肢: 楽天 / Yahoo / Amazon
  2. 作成枚数（必須）
     - タイプ: 数値
     - 最小: 1
  3. 画像サイズ（任意）
     - タイプ: セレクト
     - 選択肢: 正方形(1:1) / 横長(16:9) / 縦長(9:16) / カスタム
  4. 参考URL（任意）
     - タイプ: URL
  5. 備考（任意）
     - タイプ: テキストエリア
```

## 2.3 技術設計

### 2.3.1 新フィールドタイプ: `button_group`

> **[A14 Template Architect]** 既存の `TemplateField['type']` に `button_group` を追加。

```typescript
// src/types/template.ts
export type TemplateFieldType = 'text' | 'textarea' | 'select' | 'number' | 'url' | 'multiselect' | 'button_group'

export interface TemplateField {
  id: string
  label: string
  type: TemplateFieldType
  required: boolean
  options?: string[]       // select, multiselect, button_group 用
  placeholder?: string
  multiSelect?: boolean    // button_group: 複数選択可否
}
```

### 2.3.2 TemplateFieldRenderer 拡張

> **[A15 Form Engineer]** `TemplateFieldRenderer.tsx` に `button_group` の描画を追加。

```tsx
case 'button_group':
  return (
    <div className="flex flex-wrap gap-2">
      {field.options?.map(opt => {
        const selected = field.multiSelect
          ? (value as string[] || []).includes(opt)
          : value === opt
        return (
          <button
            key={opt}
            type="button"
            onClick={() => {
              if (field.multiSelect) {
                const arr = (value as string[] || [])
                onChange(selected ? arr.filter(v => v !== opt) : [...arr, opt])
              } else {
                onChange(opt)
              }
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
              selected
                ? 'bg-mint-dd text-white border-mint-dd'
                : 'bg-surface text-text2 border-border2 hover:border-mint'
            }`}
          >
            {opt}
          </button>
        )
      })}
    </div>
  )
```

### 2.3.3 テンプレートデータ（シード）

> **[A04 Backend Engineer]** テンプレートはUI管理画面から作成可能だが、初期データとしてシードも用意。

```typescript
const productImageTemplate = {
  name: '商品画像作成',
  description: 'EC商品画像の作成依頼テンプレート',
  fields: [
    {
      id: 'platform',
      label: 'プラットフォーム',
      type: 'button_group',
      required: true,
      options: ['楽天', 'Yahoo', 'Amazon'],
      multiSelect: true,
    },
    {
      id: 'quantity',
      label: '作成枚数',
      type: 'number',
      required: true,
      placeholder: '例: 5',
    },
    {
      id: 'image_size',
      label: '画像サイズ',
      type: 'select',
      required: false,
      options: ['正方形(1:1)', '横長(16:9)', '縦長(9:16)', 'カスタム'],
    },
    {
      id: 'reference_url',
      label: '参考URL',
      type: 'url',
      required: false,
      placeholder: 'https://...',
    },
    {
      id: 'notes',
      label: '備考',
      type: 'textarea',
      required: false,
      placeholder: '色味、雰囲気、注意点など',
    },
  ],
}
```

### 2.3.4 テンプレート管理UIの更新

> **[A15 Form Engineer]** `/templates` ページのフィールドタイプドロップダウンに `button_group` を追加。

### 2.3.5 実装見積

| Step | 内容 | 時間 |
|------|------|------|
| 1 | types/template.ts に button_group 追加 | 0.5h |
| 2 | TemplateFieldRenderer に button_group 描画 | 1h |
| 3 | テンプレート管理UIにタイプ追加 | 0.5h |
| 4 | 商品画像作成テンプレートシードデータ | 0.5h |
| 5 | テスト（作成→フォーム→送信→確認） | 1h |
| **合計** | | **3.5h** |

---

# Issue 3: WEB-1 — iPhone SEレスポンシブ崩れ

## 3.1 概要

> **[A06 Mobile Specialist]** iPhone SE (375px幅) でヘッダーが重なる問題。メニュータップ時にサイドバーオーバーレイとトップバーのz-indexが競合。

> **[A20 Compatibility Engineer]** 現行の実装:
> - モバイルハンバーガーバー: `sticky top-0 z-30`, 高さ `44px`
> - サイドバーオーバーレイ: `fixed inset-0 z-40`
> - サイドバーパネル: `z-50`
> - Topbar: `min-h-[50px]`, `border-b`

## 3.2 根本原因分析

> **[A06 Mobile Specialist]** 3つの問題が重なっている:

1. **z-index競合**: ハンバーガーバー(z-30)がサイドバーオーバーレイ(z-40)の下に隠れるが、`sticky` のためスクロール時に再出現
2. **タッチターゲット**: 375px幅でTopbar内のボタンが密集し、タップ領域が不足
3. **コンテンツ溢れ**: Topbar内のタイトル+ボタンが1行に収まらずオーバーフロー

## 3.3 修正設計

### 3.3.1 Shell.tsx 修正

```typescript
// モバイルサイドバー open 時、ハンバーガーバーを非表示にする
{!mobileOpen && (
  <div className="md:hidden sticky top-0 z-30 bg-surface border-b border-border2 h-[44px] ...">
    {/* hamburger button */}
  </div>
)}
```

> **[A03 Frontend Engineer]** サイドバーが開いている間はハンバーガーバーを隠すことで、z-index競合を根本的に解消。サイドバー内のXボタンで閉じられるので操作性に問題なし。

### 3.3.2 Topbar レスポンシブ改善

```css
/* 375px以下でTopbar内要素を折り返し */
@media (max-width: 400px) {
  .topbar-actions {
    flex-wrap: wrap;
    gap: 4px;
  }
  .topbar-actions > button {
    font-size: 11px;
    padding: 4px 8px;
  }
}
```

### 3.3.3 SafeArea対応

> **[A06 Mobile Specialist]** iPhone SEはノッチなしだがSafeArea paddingを念のため追加。

```css
.mobile-bar {
  padding-top: env(safe-area-inset-top, 0px);
}
```

### 3.3.4 実装見積

| Step | 内容 | 時間 |
|------|------|------|
| 1 | Shell.tsx z-index修正 + 条件表示 | 0.5h |
| 2 | Topbar レスポンシブ改善 | 1h |
| 3 | SafeArea padding | 0.5h |
| 4 | iPhone SE実機テスト | 1h |
| **合計** | | **3h** |

---

## 20エージェント最終レビュー

| エージェント | WEB,-14 | WEB,-2 | WEB-1 | コメント |
|-------------|---------|--------|-------|---------|
| A01 Product Owner | ✅ | ✅ | ✅ | テーマ選択はユーザー価値高い。テンプレートはEC部門の業務効率化に直結 |
| A02 UI/UX Designer | ✅ | ✅ | ✅ | カラーセレクターのプレビューUXが重要。ボタングループのデザインは既存UIと統一 |
| A03 Frontend Engineer | ✅ | ✅ | ✅ | CSSエイリアスで84ファイル変更不要は大きい。z-index修正はシンプル |
| A04 Backend Engineer | ✅ | ✅ | — | Phase 1はlocalStorageで十分。テンプレートシードはAPI経由 |
| A05 CSS Architect | ✅ | — | ✅ | data-theme属性でのCSS変数切替は標準的パターン |
| A06 Mobile Specialist | — | — | ✅ | mobileOpen時のバー非表示が最もクリーンな解決策 |
| A07 Accessibility | ✅ | ✅ | ✅ | 全テーマでコントラスト比検証必須。ボタングループにaria-pressed追加 |
| A08 QA Engineer | ✅ | ✅ | ✅ | テーマ×ダークモード=10パターンの組み合わせテスト |
| A09 i18n Engineer | ✅ | ✅ | — | テーマ名と新フィールドタイプの翻訳キー |
| A10 Security | ✅ | — | — | localStorage改ざんは視覚変化のみでセキュリティリスクなし |
| A11 Performance | ✅ | — | — | CSS変数切替はリペイントのみ。問題なし |
| A12 Brand Manager | ✅ | — | — | Meetsカラーがデフォルトなのは正しい。他テーマはオプション |
| A13 DevOps | ✅ | — | — | 環境変数不要。CSSのみの変更 |
| A14 Template Architect | — | ✅ | — | button_groupは汎用的で他テンプレートでも再利用可能 |
| A15 Form Engineer | — | ✅ | — | multiSelect対応で単一選択/複数選択を切替可能 |
| A16 Data Analyst | — | ✅ | — | テンプレート利用率トラッキングをPhase 2で |
| A17 Customer Success | ✅ | ✅ | ✅ | テーマ変更のオンボーディングガイド追加推奨 |
| A18 Integration | ✅ | ✅ | — | 既存機能への影響ゼロ設計 |
| A19 Tech Lead | ✅ | ✅ | ✅ | 3つとも既存コード改変最小。安全に実装可能 |
| A20 Compatibility | ✅ | — | ✅ | Safari/Chrome/Firefoxでテーマ切替テスト必須 |

---

## 実装優先度

| 優先度 | Issue | 理由 | 見積 |
|--------|-------|------|------|
| **P1** | WEB,-14 カラーテーマ | 全ユーザーに影響、ブランディング | 6.5h |
| **P2** | WEB,-2 テンプレート | EC部門の業務効率化 | 3.5h |
| **P3** | WEB-1 レスポンシブ | iPhone SE特定デバイスの問題 | 3h |

---

## クローズ済みIssue

| Issue | アクション | 理由 |
|-------|-----------|------|
| WEB,-1 | closed | テストデータ。コード変更不要 |
| REQUIREMEN-4 | closed | テストデータ。コード変更不要 |
| MKT-1 | closed | マーケティング質問。コードissueではない |

---

*本仕様書は20エージェントの合議により策定されました。*
