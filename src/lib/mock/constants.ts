// Shared constants for mock data — extracted to break circular dependency
// between data.ts and imported-data.ts

import type { Client } from '@/types/database'

export const DEFAULT_PASSWORD = 'workflow2026'

export const BASE_CLIENTS: Client[] = [
  { id: 'c1', name: '株式会社サンプル', created_at: '2025-01-01T00:00:00' },
  { id: 'c2', name: 'テスト工業株式会社', created_at: '2025-01-01T00:00:00' },
  { id: 'c3', name: 'グローバル商事', created_at: '2025-01-01T00:00:00' },
  { id: 'c4', name: 'Amazon', created_at: '2025-01-01T00:00:00' },
  { id: 'c5', name: 'LINEロジスティックス株式会社', created_at: '2025-01-01T00:00:00' },
  { id: 'c6', name: 'きらぼし銀行', created_at: '2025-01-01T00:00:00' },
  { id: 'c7', name: 'インターグ株式会社', created_at: '2025-01-01T00:00:00' },
  { id: 'c8', name: 'エーアンドエーマテリアル株式会社', created_at: '2025-01-01T00:00:00' },
  { id: 'c9', name: 'ゴードンミラー株式会社', created_at: '2025-01-01T00:00:00' },
  { id: 'c10', name: 'パートナー（コズコム）', created_at: '2025-01-01T00:00:00' },
  { id: 'c11', name: 'プレジデント社', created_at: '2025-01-01T00:00:00' },
  { id: 'c12', name: 'メジャークラフト株式会社', created_at: '2025-01-01T00:00:00' },
  { id: 'c13', name: '仙楽園', created_at: '2025-01-01T00:00:00' },
  { id: 'c14', name: '出光リテール販売株式会社 東海北陸カンパニー', created_at: '2025-01-01T00:00:00' },
  { id: 'c15', name: '出光興産株式会社', created_at: '2025-01-01T00:00:00' },
  { id: 'c16', name: '北海道乳業株式会社', created_at: '2025-01-01T00:00:00' },
  { id: 'c17', name: '新井クリエイト', created_at: '2025-01-01T00:00:00' },
  { id: 'c18', name: '星光産業株式会社', created_at: '2025-01-01T00:00:00' },
  { id: 'c19', name: '株式会社EN', created_at: '2025-01-01T00:00:00' },
  { id: 'c20', name: '株式会社GMP', created_at: '2025-01-01T00:00:00' },
  { id: 'c21', name: '株式会社LUCE', created_at: '2025-01-01T00:00:00' },
  { id: 'c22', name: '株式会社SPINDLE', created_at: '2025-01-01T00:00:00' },
  { id: 'c23', name: '株式会社アイシン', created_at: '2025-01-01T00:00:00' },
  { id: 'c24', name: '株式会社イートップ', created_at: '2025-01-01T00:00:00' },
  { id: 'c25', name: '株式会社プレブ', created_at: '2025-01-01T00:00:00' },
  { id: 'c26', name: '株式会社武居商店', created_at: '2025-01-01T00:00:00' },
  { id: 'c27', name: '葉山家具', created_at: '2025-01-01T00:00:00' },
  { id: 'c-unset', name: '', created_at: '2020-01-01T00:00:00' },
]
