# レスポンシブ対応 仕様書

## ブレークポイント
- **Mobile**: < 768px (sm)
- **Tablet**: 768px - 1024px (md)
- **Desktop**: > 1024px (lg)

## 1. サイドバー
- Mobile: 非表示、ハンバーガーメニューでオーバーレイ表示（実装済み）
- Tablet: 折りたたみ（アイコンのみ56px）
- Desktop: フル表示（192px）

## 2. ダッシュボード
- Mobile: KPIカード2列→1列、クリエイター/クライアントビューは縦積み
- Tablet: KPIカード2列
- Desktop: KPIカード4列（現状維持）

## 3. タスク一覧
- Mobile: テーブル→カード表示に切替、フィルタは折りたたみ
- Tablet: テーブル（一部列非表示）
- Desktop: フルテーブル（現状維持）

## 4. タスク詳細
- Mobile: 2カラム→1カラム縦積み
- Tablet: 2カラム（幅調整）
- Desktop: 2カラム（現状維持）

## 5. タスク依頼フォーム
- Mobile: フル幅、パディング調整
- Tablet/Desktop: max-width制限（現状維持）

## 6. 課題一覧/詳細
- タスク一覧/詳細と同様のパターン

## 7. メンバー管理
- Mobile: テーブル→カード表示
- 組織図: 縦スクロール対応

## 8. プロジェクト一覧
- Mobile: カード1列
- Tablet: カード2列
- Desktop: カード2-3列

## 9. Topbar
- Mobile: タイトル短縮、ボタンアイコン化
- Tablet/Desktop: フル表示

## 10. モーダル/ダイアログ
- Mobile: フル画面化（max-width: 100vw）
- Tablet/Desktop: 中央配置（現状維持）
