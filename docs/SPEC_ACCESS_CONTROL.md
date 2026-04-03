# アクセスドメイン制御 仕様書

## 概要
メンバー別に機能アクセス権限を管理。管理者がメンバー管理画面で各メンバーの閲覧可能機能を設定。

## アクセスドメイン
| ドメイン | デフォルトアクセス | 説明 |
|---------|------------------|------|
| tasks | 全員 | タスク管理 |
| issues | 全員 | 課題管理 |
| projects | 全員 | プロジェクト |
| workload | 全員 | 稼働管理 |
| pipeline | admin, director | パイプライン |
| crm | admin, director | CRM(顧客情報) |
| chat | 全員 | チャット |
| members | admin, director | メンバー管理 |
| settings | admin | 設定 |
| reports | 全員 | レポート |

## DB: user_access_domains
ユーザーごとのアクセスドメインをJSONBで管理（usersテーブルにカラム追加）

## UI: メンバー管理画面
管理者がメンバー編集時にチェックボックスでアクセスドメインを設定

## フロントエンド制御
Sidebar.tsxでユーザーのaccess_domainsを参照してナビ項目を表示/非表示
