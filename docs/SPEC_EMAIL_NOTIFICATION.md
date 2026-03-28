# タスクアサイン時メール通知 — 仕様書

**作成日**: 2026-03-28
**ステータス**: 設計完了 → 実装待ち

---

## 1. 概要

タスクがクリエイターにアサインされた際、アサインされたメンバーに自動でメール通知を送信する機能を実装する。

### 目的
- アサイン漏れの防止
- クリエイターへのリアルタイムな作業依頼通知
- タスクの詳細情報をメールで即座に確認可能にする

---

## 2. メール設定

### 2.1 SMTP設定
| 項目 | 値 |
|------|-----|
| SMTPサーバー | smtp.gmail.com |
| ポート | 587 (STARTTLS) |
| 認証方式 | Gmail App Password |
| 送信元アドレス | client.report.meetsc@gmail.com |
| 送信元表示名 | WorkFlow Task Management |

### 2.2 環境変数
```env
# .env.local に設定（Gitにコミットしない）
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=client.report.meetsc@gmail.com
SMTP_PASSWORD=<Gmail App Password>
SMTP_FROM_NAME=WorkFlow Task Management
SMTP_FROM_EMAIL=client.report.meetsc@gmail.com
```

### 2.3 Vercel環境変数
Vercelダッシュボードで以下を設定:
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM_NAME`, `SMTP_FROM_EMAIL`

### 2.4 Vercel環境変数設定手順

1. Vercelダッシュボード → Settings → Environment Variables に移動
2. 以下の変数を追加（Production環境）:

| 変数名 | 値 |
|--------|-----|
| `SMTP_HOST` | `smtp.gmail.com` |
| `SMTP_PORT` | `587` |
| `SMTP_USER` | `client.report.meetsc@gmail.com` |
| `SMTP_PASSWORD` | `(Gmail App Password)` |
| `SMTP_FROM_NAME` | `WorkFlow Task Management` |
| `SMTP_FROM_EMAIL` | `client.report.meetsc@gmail.com` |

3. 設定後、再デプロイが必要（Settings → Deployments → Redeploy）

### 2.5 Gmail App Password 取得方法

1. Google Account → Security → 2-Step Verification を有効化
2. Security → App passwords で新しいパスワードを生成
3. 生成された16文字のパスワードを `SMTP_PASSWORD` に設定

---

## 3. 機能仕様

### 3.1 トリガー条件
メール送信が発生するタイミング:

| # | トリガー | 送信先 | 条件 |
|---|---------|--------|------|
| 1 | タスクアサイン（初回） | アサインされたクリエイター | `assignTask()` 実行時 |
| 2 | アサイン変更 | 新しいアサイン先 | `AssignChangeModal` で変更時 |
| 3 | マルチアサイン追加 | 追加されたメンバー | `addTaskAssignee()` 実行時 |

### 3.2 送信しない条件
- 自分自身にアサインした場合（ディレクター＝アサイン先）
- メールアドレスが未設定のユーザー
- `is_active: false` のユーザー
- モックモード（`NEXT_PUBLIC_USE_MOCK=true`）

### 3.3 メール内容

#### 件名
```
[WorkFlow] タスクがアサインされました: {タスクタイトル}
```

英語モード:
```
[WorkFlow] Task assigned to you: {Task Title}
```

#### 本文（HTMLメール）

```html
<div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background: #6FB5A3; padding: 20px; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; font-size: 18px; margin: 0;">
      WorkFlow — タスク通知
    </h1>
  </div>

  <div style="padding: 24px; background: #FAFCFB; border: 1px solid #CCDDD8;">
    <p style="color: #2A3A36; font-size: 14px;">
      {アサイン先の名前}さん、新しいタスクがアサインされました。
    </p>

    <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
      <tr>
        <td style="padding: 8px; color: #647870; font-size: 12px; width: 120px;">タスク名</td>
        <td style="padding: 8px; color: #2A3A36; font-size: 14px; font-weight: bold;">{タスクタイトル}</td>
      </tr>
      <tr>
        <td style="padding: 8px; color: #647870; font-size: 12px;">クライアント</td>
        <td style="padding: 8px; color: #2A3A36; font-size: 14px;">{クライアント名}</td>
      </tr>
      <tr>
        <td style="padding: 8px; color: #647870; font-size: 12px;">確定納期</td>
        <td style="padding: 8px; color: #2A3A36; font-size: 14px;">{確定納期 or 未設定}</td>
      </tr>
      <tr>
        <td style="padding: 8px; color: #647870; font-size: 12px;">見積工数</td>
        <td style="padding: 8px; color: #2A3A36; font-size: 14px;">{見積時間}h</td>
      </tr>
      <tr>
        <td style="padding: 8px; color: #647870; font-size: 12px;">ディレクター</td>
        <td style="padding: 8px; color: #2A3A36; font-size: 14px;">{ディレクター名}</td>
      </tr>
      <tr>
        <td style="padding: 8px; color: #647870; font-size: 12px;">説明</td>
        <td style="padding: 8px; color: #2A3A36; font-size: 13px;">{説明文（最大200文字）}</td>
      </tr>
    </table>

    <a href="{APP_URL}/tasks/{taskId}"
       style="display: inline-block; background: #6FB5A3; color: white;
              padding: 12px 24px; border-radius: 8px; text-decoration: none;
              font-size: 14px; font-weight: bold;">
      タスクを確認する →
    </a>
  </div>

  <div style="padding: 16px; text-align: center; color: #9DAFAA; font-size: 11px;">
    このメールはWorkFlowタスク管理システムから自動送信されています。
  </div>
</div>
```

---

## 4. 技術仕様

### 4.1 アーキテクチャ

```
[アサイン操作]
    ↓
[src/lib/data/tasks.ts] assignTask() / addTaskAssignee()
    ↓
[src/lib/email/send-email.ts] sendEmail()
    ↓
[src/lib/email/templates.ts] getAssignmentEmailHtml()
    ↓
[Nodemailer] → SMTP → Gmail → クリエイターの受信箱
```

### 4.2 新規ファイル

| ファイル | 役割 |
|---------|------|
| `src/lib/email/send-email.ts` | Nodemailer SMTP送信ラッパー |
| `src/lib/email/templates.ts` | HTMLメールテンプレート |
| `src/lib/email/task-assignment.ts` | アサイン通知メールの組み立て・送信 |
| `src/app/api/email/test/route.ts` | テスト送信API（開発用） |

### 4.3 依存パッケージ
```
npm install nodemailer
npm install -D @types/nodemailer
```

### 4.4 既存ファイルの変更

| ファイル | 変更内容 |
|---------|---------|
| `src/lib/data/tasks.ts` | `assignTask()` にメール送信呼び出しを追加 |
| `src/app/(main)/settings/page.tsx` | メール設定タブの追加（テスト送信ボタン） |
| `.env.local.example` | SMTP環境変数の追記 |
| `src/lib/i18n/translations.ts` | メール関連のi18nキー追加 |

### 4.5 エラーハンドリング
- メール送信失敗時はタスクアサイン自体は成功させる（非同期・非ブロッキング）
- 送信エラーは `console.error` でログ出力
- アプリ内通知（既存のNotification機能）は引き続き動作する
- 3回リトライ（1秒間隔）

### 4.6 セキュリティ
- SMTPパスワードは環境変数のみで管理（コードにハードコードしない）
- `.env.local` は `.gitignore` で除外済み
- Vercelでは暗号化された環境変数として設定
- メール本文のユーザー入力値はHTMLエスケープ処理

---

## 5. 設定画面（オプション）

Settings ページに「メール通知」タブを追加:

| 設定項目 | 説明 | デフォルト |
|---------|------|----------|
| メール通知の有効/無効 | 全体のON/OFF | ON |
| テスト送信ボタン | 自分宛にテストメール送信 | — |
| 送信元表示名 | メールの差出人名 | WorkFlow Task Management |

---

## 6. テスト計画

| # | テスト | 期待結果 |
|---|-------|---------|
| 1 | タスクをアサインする | アサイン先にメールが届く |
| 2 | 自分自身にアサインする | メールは送信されない |
| 3 | アサイン変更する | 新しいアサイン先にメールが届く |
| 4 | マルチアサインで追加する | 追加されたメンバーにメールが届く |
| 5 | SMTP設定が空の場合 | メール送信スキップ、アサインは成功 |
| 6 | 不正なメールアドレスの場合 | エラーログ出力、アサインは成功 |
| 7 | テスト送信ボタン | 設定ユーザー宛にテストメールが届く |
| 8 | モックモードの場合 | メール送信されない |

---

## 7. 実装フェーズ

### Phase 1: 基盤（1-2h）
- Nodemailerインストール
- `send-email.ts` SMTP送信関数
- `templates.ts` HTMLテンプレート
- 環境変数設定

### Phase 2: 統合（1-2h）
- `task-assignment.ts` アサイン通知ロジック
- `assignTask()` にメール送信フック
- `addTaskAssignee()` にメール送信フック

### Phase 3: 設定・テスト（1h）
- テスト送信API
- Settings ページにメールタブ
- E2Eテスト

---

## 8. 見積り
- **開発工数**: 約4-5時間
- **20人エージェント**: 約10分で全実装可能
