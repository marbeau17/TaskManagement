# 認証修正 + ダークモード仕様書

**作成日**: 2026-03-24

---

## 1. 認証修正

### 1.1 問題
- ログイン時に「メールアドレスまたはパスワードが正しくありません」エラー
- Supabase Auth API自体は正常動作（API直接テストで確認済み）
- 原因候補:
  1. NEXT_PUBLIC_USE_MOCK がビルドキャッシュで `true` のまま
  2. signInWithPassword 後のプロファイル取得がRLSで失敗
  3. エラーハンドリングが不十分で原因が見えない

### 1.2 修正方針
- ログインページにデバッグ用のエラー詳細表示を追加
- signInWithPassword のエラーメッセージをそのまま表示
- プロファイル取得失敗時も認証自体は成功として扱う
- Vercelキャッシュをパージして再デプロイ
- ログインフローにconsole.errorを追加

### 1.3 フォールバック戦略
- プロファイル取得失敗時: Auth userのメタデータからユーザー情報を構築
- RLSが問題の場合: service_role keyを使うAPI route経由でプロファイル取得

---

## 2. ダークモード

### 2.1 概要
ミント系のカラーパレットを維持しつつ、ダークモードを追加。

### 2.2 実装方式
- Tailwind CSS の `dark:` プレフィックスを使用
- `<html>` タグに `class="dark"` を切り替え
- ローカルストレージでユーザーの選択を永続化
- システム設定に追従するオプション

### 2.3 ダークモードカラーパレット
```
Background:
  --bg:        #1A2420 (dark green-black)
  --surface:   #1F2E28 (dark card)
  --surf2:     #253530 (dark secondary)
  --surf3:     #2B3D36 (dark tertiary)

Text:
  --text:      #E8F0EC (light green-white)
  --text2:     #A8B8B0 (muted light)
  --text3:     #6B7D75 (dim)

Border:
  --border:    #3A4D45
  --border2:   #2F4038

Sidebar:
  --sidebar-bg: #152018 (darker green)

Status colors: 同じ色相、彩度を下げてダーク背景に合うよう調整
```

### 2.4 切替UI
- サイドバー下部のユーザーメニュー（歯車アイコン）にテーマ切替を追加
- 設定ページにもテーマ設定セクション
- 3オプション: ライト / ダーク / システム設定に追従

### 2.5 影響範囲
- `src/app/globals.css`: `:root` と `.dark` でCSS変数切替
- `src/stores/uiStore.ts`: theme state追加
- `src/components/layout/Sidebar.tsx`: テーマ切替メニュー
- `src/app/layout.tsx`: dark class適用
- 各コンポーネント: `dark:` プレフィックスの追加（必要に応じて）
