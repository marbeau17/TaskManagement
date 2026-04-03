# タスク単位チャット仕様書

## 概要
チャットサイドバーにプロジェクト→タスクのツリー構造を表示。
各タスクに専用チャットチャンネルが自動作成され、タスク関係者がリアルタイムにコミュニケーション可能。

## サイドバー構造
```
チャンネル
├── 🏠 general
├── # カスタムチャンネル
│
プロジェクト
├── 📁 MVV
│   ├── 💬 タスクA
│   └── 💬 タスクB
├── 📁 ECサイト構築
│   ├── 💬 商品画像作成
│   └── 💬 LP制作
└── 📁 Task Management
    └── 💬 CRM開発
```

## 仕組み
- タスクチャンネルは `channel_type: 'task'`, `task_id` で紐付け
- タスク詳細ページに「チャットを開く」リンク
- チャンネル作成: タスクの初回チャット時に自動作成
- メンバー: タスクのassigned_to + director_id + requester が自動参加

## DB設計 (chat_channels 拡張)
| カラム        | 型      | 説明                           |
|--------------|---------|-------------------------------|
| channel_type | text    | 'public' / 'private' / 'dm' / 'task' |
| task_id      | uuid    | tasks.id への FK (nullable)    |
| project_id   | uuid    | projects.id への FK (nullable) |

## API
- `POST /api/chat/channels` — `channel_type: 'task'`, `task_id` を指定してタスクチャンネル作成
- `GET /api/chat/channels` — `channel_type=task` でフィルタ可能

## サイドバー実装
1. 既存チャンネル一覧から `channel_type === 'task'` または `project_id` 付きを抽出
2. プロジェクト単位でグループ化して表示
3. タスクチャンネルが未作成の場合、タスク詳細から初回アクセス時に自動作成

## タスク詳細ページ連携
- タスク詳細に「チャットを開く」ボタンを設置
- クリック時: 既存チャンネルがあれば遷移、なければ自動作成して遷移
- API: `GET /api/chat/channels?task_id={id}` で存在確認

## 権限
- タスクチャンネルはタスクの関係者(assigned_to, director_id, requester)が自動参加
- プロジェクトメンバーは閲覧可能

## 将来拡張
- タスクステータス変更時の自動通知投稿
- ファイル添付のタスク添付ファイルとの統合
- メンション → タスクコメントへの転記
