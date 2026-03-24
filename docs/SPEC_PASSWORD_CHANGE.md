# 初期パスワード・強制変更機能 仕様書

**バージョン**: v1.0
**作成日**: 2026-03-24

---

## 1. 概要

新規メンバー追加時に初期パスワード `workflow2026` を設定し、初回ログイン後にパスワード変更を強制する機能。

## 2. ユーザーフロー

```
メンバー招待 → 初期パスワード設定 → 初回ログイン → 強制パスワード変更画面
→ 新パスワード入力 → 変更完了 → ダッシュボードへ
```

### 2.1 管理者によるメンバー招待
1. メンバー管理画面で「+ メンバー招待」をクリック
2. 名前、メール、ロール、週キャパを入力
3. 初期パスワード `workflow2026` が自動設定される
4. `must_change_password: true` フラグが設定される

### 2.2 初回ログイン → 強制パスワード変更
1. ユーザーがメール + 初期パスワードでログイン
2. システムが `must_change_password` フラグを確認
3. `true` の場合、パスワード変更画面 (`/change-password`) にリダイレクト
4. ユーザーは他の画面に遷移できない（ミドルウェアでブロック）

### 2.3 パスワード変更画面
- 新しいパスワード入力（8文字以上）
- パスワード確認入力
- 「パスワードを変更する」ボタン
- 変更成功後: `must_change_password: false` に更新、ダッシュボードへリダイレクト

### 2.4 通常ログイン（2回目以降）
1. メール + パスワードでログイン
2. `must_change_password: false` → ダッシュボードへ直接遷移

## 3. データ変更

### 3.1 User型に追加
```typescript
interface User {
  // ... 既存フィールド
  must_change_password: boolean  // 新規追加
}
```

### 3.2 モックデータ
- 既存ユーザー: `must_change_password: false`（既にパスワード変更済みとみなす）
- 新規追加ユーザー: `must_change_password: true`

### 3.3 DBマイグレーション
```sql
ALTER TABLE users ADD COLUMN must_change_password BOOLEAN DEFAULT true;
```

## 4. 画面仕様

### 4.1 強制パスワード変更画面 (`/change-password`)
- ログイン画面と同じデザイン（中央配置カード）
- WorkFlowロゴ
- タイトル: 「パスワードの変更が必要です」
- サブテキスト: 「セキュリティのため、初期パスワードを変更してください。」
- 新しいパスワード入力（8文字以上）
- パスワード確認入力
- 「パスワードを変更する」ボタン（bg-mint）
- バリデーションエラー表示
- 成功メッセージ → 自動遷移

### 4.2 ログイン画面の変更
- ログイン成功後、`must_change_password` チェックを追加
- `true` → `/change-password` へリダイレクト
- `false` → `/dashboard` へリダイレクト

### 4.3 招待モーダルの変更
- 「初期パスワード: workflow2026（初回ログイン時に変更が必要です）」と表示

## 5. ルーティング・ミドルウェア

| パス | must_change_password=true | must_change_password=false |
|------|:------------------------:|:--------------------------:|
| /login | アクセス可 | アクセス可 |
| /change-password | アクセス可 | /dashboard にリダイレクト |
| /dashboard, /tasks/* 等 | /change-password にリダイレクト | アクセス可 |

## 6. API

### POST /api/auth/force-change-password
- Body: `{ userId, newPassword }`
- 処理: パスワード変更 + `must_change_password: false` に更新
- Response: `{ success: true }`

## 7. 影響範囲

| ファイル | 変更内容 |
|---------|---------|
| `src/types/database.ts` | User型に `must_change_password` 追加 |
| `src/lib/mock/data.ts` | 全ユーザーに `must_change_password` フィールド追加 |
| `src/lib/mock/handlers.ts` | `addMockMember` で `must_change_password: true` 設定、`forceChangeMockPassword` 追加 |
| `src/lib/data/members.ts` | `forceChangePassword` 関数追加 |
| `src/hooks/useAuth.ts` | ログイン後の `must_change_password` チェック |
| `src/stores/authStore.ts` | `must_change_password` 状態管理 |
| `src/app/(auth)/login/page.tsx` | リダイレクト先の条件分岐 |
| `src/app/(auth)/change-password/page.tsx` | 新規: 強制パスワード変更画面 |
| `src/components/members/InviteMemberModal.tsx` | 表示メッセージ更新 |
| `src/app/api/auth/force-change-password/route.ts` | 新規: APIルート |
| `supabase/migrations/008_add_must_change_password.sql` | 新規: マイグレーション |
