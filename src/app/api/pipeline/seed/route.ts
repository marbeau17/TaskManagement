import { NextResponse } from 'next/server'

// Parsed data from PipeLinemanagement.xlsx "pipeline management" sheet
const PIPELINE_DATA = [
  { seq: 4, isNew: false, client: '出光興産株式会社', ref: '自社', opp: 'apolloONE', sub: 'Blog', status: 'Firm', prob: 100, cm: 80, pm: 'Yasuda', c1: 'Takimiya', c2: '', rev: [0,0,450,450,750,450,0,0,0,0,0,0] },
  { seq: 5, isNew: false, client: '出光興産株式会社', ref: '自社', opp: 'apolloONE', sub: 'Chatbot', status: 'Firm', prob: 100, cm: 80, pm: 'Yasuda', c1: 'Takimiya', c2: '', rev: [0,0,0,600,160,160,160,160,160,160,160,160] },
  { seq: 6, isNew: false, client: '出光興産株式会社', ref: '自社', opp: 'apolloONE', sub: 'Instagram', status: 'Likely', prob: 50, cm: 20, pm: 'Ito', c1: 'Takimiya', c2: '', rev: [0,0,0,0,0,0,0,0,0,0,0,0] },
  { seq: 8, isNew: false, client: '出光興産株式会社', ref: '自社', opp: 'apolloONE', sub: '広告運用', status: 'Firm', prob: 100, cm: 10, pm: 'Ito', c1: 'Watanabe', c2: '', rev: [900,900,900,2400,2400,2400,2400,2400,2400,2400,2400,2400] },
  { seq: 31, isNew: false, client: '出光興産株式会社', ref: '自社', opp: 'apolloONE', sub: '戦略コンサルティング', status: 'Firm', prob: 100, cm: 50, pm: 'Ito', c1: 'Ito', c2: '', rev: [0,0,0,0,0,0,800,800,800,800,800,800] },
  { seq: 32, isNew: false, client: '出光興産株式会社', ref: '自社', opp: 'apolloONE', sub: 'サイト制作', status: 'Firm', prob: 100, cm: 50, pm: 'Takimiya', c1: '', c2: '', rev: [500,1000,500,0,100,0,0,0,0,0,0,0] },
  { seq: 33, isNew: false, client: '出光興産株式会社', ref: '自社', opp: 'apolloONE', sub: '動画制作', status: 'Firm', prob: 100, cm: 50, pm: 'Ito', c1: '', c2: '', rev: [0,0,1500,500,0,0,0,0,0,0,0,0] },
  { seq: 34, isNew: false, client: '出光興産株式会社', ref: '自社', opp: 'apolloONE', sub: 'サイト改修', status: 'Likely', prob: 100, cm: 50, pm: 'Takimiya', c1: '', c2: '', rev: [0,0,0,0,580,0,0,0,0,0,0,0] },
  { seq: 39, isNew: false, client: '出光興産株式会社', ref: '自社', opp: 'apolloONE', sub: 'バナー作成', status: 'Firm', prob: 100, cm: 50, pm: 'Takimiya', c1: '', c2: '', rev: [200,200,200,200,200,200,200,200,200,200,200,200] },
  { seq: 40, isNew: false, client: '出光興産株式会社', ref: '自社', opp: 'ポチモ', sub: 'LINE×Xキャンペーン', status: 'Firm', prob: 100, cm: 20, pm: 'Ito', c1: 'Watanabe', c2: '', rev: [737,737,737,0,550,1944,0,0,0,0,0,0] },
  { seq: 7, isNew: false, client: '出光興産株式会社', ref: '自社', opp: 'オートシェア', sub: '戦略策定・PM', status: 'Firm', prob: 100, cm: 50, pm: 'Ito', c1: 'Ito', c2: '', rev: [0,0,0,0,400,400,400,400,400,0,0,0] },
  { seq: 41, isNew: false, client: '出光興産株式会社', ref: '自社', opp: 'オートシェア', sub: '広告運用', status: 'Firm', prob: 100, cm: 10, pm: 'Ito', c1: 'Watanabe', c2: '', rev: [0,0,0,0,0,1500,1500,1500,1500,0,0,0] },
  { seq: 22, isNew: false, client: '出光興産株式会社', ref: '自社', opp: 'オートフラット', sub: '広告運用', status: 'Firm', prob: 100, cm: 10, pm: 'Ito', c1: 'Watanabe', c2: '', rev: [300,300,300,300,300,300,0,0,0,0,0,0] },
  { seq: 19, isNew: false, client: '出光興産株式会社', ref: '自社', opp: 'ポチモ', sub: 'LINE運用・システム料', status: 'Firm', prob: 100, cm: 50, pm: 'Ito', c1: 'Watanabe', c2: '', rev: [400,400,400,400,400,400,0,0,0,0,0,0] },
  { seq: 20, isNew: false, client: '出光興産株式会社', ref: '自社', opp: 'ポチモ', sub: '戦略設計・マーケティング', status: 'Firm', prob: 100, cm: 50, pm: 'Ito', c1: 'Ito', c2: '', rev: [800,800,800,800,800,800,0,0,0,0,0,0] },
  { seq: 21, isNew: false, client: '出光興産株式会社', ref: '自社', opp: 'ポチモ', sub: 'X運用', status: 'Firm', prob: 100, cm: 50, pm: 'Ito', c1: 'Ito', c2: '', rev: [200,200,200,200,200,200,0,0,0,0,0,0] },
  { seq: 42, isNew: false, client: '出光興産株式会社', ref: '自社', opp: 'オートシェア', sub: 'クリエイティブ制作', status: 'Firm', prob: 100, cm: 50, pm: 'Ito', c1: 'Takimiya', c2: '', rev: [0,0,0,0,0,400,400,400,400,0,0,0] },
  { seq: 43, isNew: false, client: '出光興産株式会社', ref: '自社', opp: 'apolloONE', sub: '動画制作', status: 'Firm', prob: 100, cm: 50, pm: 'Watanabe', c1: '', c2: '', rev: [0,0,0,0,80,80,0,0,0,0,0,0] },
  { seq: 52, isNew: true, client: '出光興産株式会社', ref: '自社', opp: 'apolloONE', sub: 'サイト新設', status: 'Firm', prob: 100, cm: 50, pm: 'Takimiya', c1: 'Yasuda', c2: 'Luca', rev: [0,0,0,0,0,0,1750,1750,300,300,300,300] },
  { seq: 59, isNew: false, client: '出光興産株式会社', ref: '自社', opp: 'apolloONE', sub: 'コラム', status: 'Likely', prob: 50, cm: 50, pm: 'Takimiya', c1: 'Yasuda', c2: '', rev: [0,0,0,0,0,0,2000,2000,0,0,0,0] },
  { seq: 62, isNew: false, client: '出光興産株式会社', ref: '自社', opp: 'ポチモ', sub: 'LINE×Xキャンペーン_広告運用', status: 'Firm', prob: 100, cm: 20, pm: '', c1: '', c2: '', rev: [400,400,400,0,400,800,0,0,0,0,0,0] },
  { seq: 38, isNew: false, client: 'インターグ株式会社', ref: '自社', opp: 'Amazon支援', sub: '', status: 'Firm', prob: 100, cm: 50, pm: 'Ito', c1: 'Ito', c2: '', rev: [400,100,0,0,0,0,0,0,0,0,0,0] },
  { seq: 3, isNew: false, client: 'エーアンドエーマテリアル株式会社', ref: 'きらぼし銀行', opp: '新規事業開発', sub: 'PH2', status: 'Likely', prob: 80, cm: 50, pm: 'Ito', c1: 'Ito', c2: '', rev: [0,0,0,0,0,0,0,1600,1600,1600,1600,1600] },
  { seq: 35, isNew: false, client: 'エーアンドエーマテリアル株式会社', ref: 'きらぼし銀行', opp: '新規事業開発', sub: 'PH1', status: 'Firm', prob: 100, cm: 50, pm: 'Ito', c1: 'Ito', c2: '', rev: [640,640,640,0,0,0,0,0,0,0,0,0] },
  { seq: 29, isNew: true, client: '金鶴食品株式会社', ref: 'きらぼし銀行', opp: '楽天支援', sub: '', status: 'Likely', prob: 0, cm: 0, pm: 'Ito', c1: '', c2: '', rev: [0,0,0,0,0,0,0,0,0,0,0,0] },
  { seq: 25, isNew: false, client: '株式会社AISIN', ref: '自社', opp: 'Amazon支援', sub: 'Amazonコンサル', status: 'Firm', prob: 100, cm: 50, pm: 'Ito', c1: '', c2: '', rev: [600,600,600,600,600,600,600,600,600,600,600,600] },
  { seq: 49, isNew: true, client: '株式会社AISIN', ref: '自社', opp: 'クリエイティブ制作', sub: '', status: 'Firm', prob: 80, cm: 50, pm: 'Takimiya', c1: '', c2: '', rev: [0,0,0,0,0,480,0,0,0,0,0,0] },
  { seq: 50, isNew: true, client: '株式会社AISIN', ref: '自社', opp: '楽天支援', sub: '', status: 'Likely', prob: 70, cm: 60, pm: 'Takimiya', c1: '', c2: '', rev: [0,0,0,0,0,0,0,250,250,400,400,400] },
  { seq: 1, isNew: false, client: '株式会社EN', ref: '横浜信用金庫', opp: 'Amazon支援', sub: '', status: 'Likely', prob: 50, cm: 50, pm: 'Yasuda', c1: '', c2: '', rev: [0,0,0,0,0,0,300,300,300,300,300,300] },
  { seq: 18, isNew: false, client: '株式会社SPINDLE', ref: '自社', opp: 'EC代行支援', sub: '', status: 'Firm', prob: 100, cm: 50, pm: 'Takimiya', c1: '', c2: '', rev: [1200,1200,1200,1200,1200,1200,2000,2000,2000,2000,2000,2000] },
  { seq: 51, isNew: true, client: '株式会社SPINDLE', ref: '自社', opp: '新規出店', sub: 'デイトナ', status: 'Likely', prob: 0, cm: 0, pm: 'Takimiya', c1: '', c2: '', rev: [0,0,0,0,0,0,0,0,0,0,0,0] },
  { seq: 45, isNew: false, client: '株式会社上野製作所', ref: 'きらぼし銀行', opp: '新規事業開発', sub: '', status: 'Likely', prob: 30, cm: 50, pm: '', c1: '', c2: '', rev: [0,0,0,0,0,0,0,0,0,0,0,0] },
  { seq: 28, isNew: false, client: '株式会社セイワ', ref: '自社', opp: 'Rakuten/Yahoo支援', sub: '', status: 'Firm', prob: 100, cm: 70, pm: 'Ito', c1: '', c2: '', rev: [1200,1200,1200,1200,1200,1200,1200,1200,1200,1200,1200,1200] },
  { seq: 16, isNew: false, client: '株式会社武居商店', ref: '横浜信用金庫', opp: 'Rakuten/Yahoo支援', sub: '', status: 'Firm', prob: 100, cm: 40, pm: 'Yasuda', c1: 'Watanabe', c2: '', rev: [500,500,500,500,500,500,500,500,500,500,500,500] },
  { seq: 9, isNew: false, client: '株式会社葉山ガーデン', ref: '横浜信用金庫', opp: '自社ECサイト', sub: '', status: 'Likely', prob: 0, cm: 40, pm: 'Yasuda', c1: 'Yasuda', c2: '', rev: [0,0,0,0,0,0,0,0,0,0,0,0] },
  { seq: 48, isNew: false, client: '株式会社ふじいろ', ref: '横浜信用金庫', opp: 'Amazon', sub: '', status: 'Likely', prob: 50, cm: 0, pm: 'Ito', c1: '', c2: '', rev: [0,0,0,0,0,0,0,0,0,0,0,0] },
  { seq: 46, isNew: false, client: '株式会社プリンタス', ref: 'きらぼし銀行', opp: 'EC支援', sub: '', status: 'Likely', prob: 30, cm: 50, pm: '', c1: '', c2: '', rev: [0,0,0,0,0,0,0,0,0,0,0,0] },
  { seq: 17, isNew: false, client: '株式会社プレブ', ref: '横浜信用金庫', opp: 'Amazon支援', sub: '', status: 'Firm', prob: 100, cm: 40, pm: 'Yasuda', c1: 'Watanabe', c2: '', rev: [375,375,375,375,375,375,375,0,0,0,0,0] },
  { seq: 56, isNew: false, client: '株式会社プレブ', ref: '横浜信用金庫', opp: 'Amazon支援', sub: 'PH2', status: 'Firm', prob: 100, cm: 40, pm: 'Yasuda', c1: 'Watanabe', c2: '', rev: [0,0,0,0,0,0,0,375,375,375,375,375] },
  { seq: 61, isNew: false, client: 'グローブライド株式会社', ref: '', opp: '', sub: '', status: 'Firm', prob: 100, cm: 0, pm: 'Takimiya', c1: 'Takimiya', c2: '', rev: [0,0,0,0,0,0,450,450,450,450,450,450] },
  { seq: 10, isNew: false, client: '公益財団法人どうぶつ基金', ref: 'きらぼし銀行', opp: 'デジタルマーケティング', sub: '', status: 'Likely', prob: 100, cm: 50, pm: 'Takimiya', c1: 'Takimiya', c2: '', rev: [0,0,0,0,0,0,200,200,0,0,0,0] },
  { seq: 36, isNew: false, client: 'ゴードンミラー株式会社', ref: '自社', opp: 'Amazon支援', sub: 'PH3', status: 'Firm', prob: 100, cm: 50, pm: 'Ito', c1: '', c2: '', rev: [720,0,0,0,0,0,0,0,0,0,0,0] },
  { seq: 37, isNew: false, client: 'ゴードンミラー株式会社', ref: '自社', opp: 'Yahoo支援', sub: 'PH3', status: 'Firm', prob: 100, cm: 50, pm: 'Ito', c1: 'Takimiya', c2: '', rev: [360,0,0,0,0,0,0,0,0,0,0,0] },
  { seq: 26, isNew: false, client: '星光産業株式会社', ref: '自社', opp: 'Japan', sub: 'Amazonコンサル', status: 'Firm', prob: 100, cm: 60, pm: 'Ito', c1: '', c2: '', rev: [200,200,200,200,200,200,200,200,200,200,200,200] },
  { seq: 27, isNew: false, client: '星光産業株式会社', ref: '自社', opp: 'US', sub: 'Amazonコンサル', status: 'Firm', prob: 100, cm: 60, pm: 'Ito', c1: '', c2: '', rev: [200,200,200,200,200,200,200,200,200,200,200,200] },
  { seq: 44, isNew: false, client: '武井商店株式会社', ref: '横浜信用金庫', opp: '自社ECサイト', sub: 'サイト制作', status: 'Likely', prob: 50, cm: 50, pm: 'Yasuda', c1: '', c2: '', rev: [0,0,0,0,0,0,0,0,0,0,0,0] },
  { seq: 24, isNew: false, client: 'ディーエヌ株式会社', ref: '自社', opp: 'Rakuten/Yahoo', sub: 'ECコンサル', status: 'Firm', prob: 100, cm: 60, pm: 'Ito', c1: '', c2: '', rev: [300,300,300,300,300,300,300,300,300,300,300,300] },
  { seq: 12, isNew: false, client: 'メジャークラフト株式会社', ref: '自社', opp: 'Amazon支援', sub: '', status: 'Likely', prob: 80, cm: 60, pm: 'Ito', c1: '', c2: '', rev: [2000,2000,0,0,500,0,0,0,0,0,0,0] },
  { seq: 11, isNew: false, client: 'メジャークラフト株式会社', ref: '自社', opp: '簡易財務調査', sub: '', status: 'Win', prob: 100, cm: 50, pm: 'Ito', c1: 'Ito', c2: '', rev: [0,0,0,500,500,0,0,0,0,0,0,0] },
  { seq: 47, isNew: true, client: '有限会社大桜', ref: '横浜信用金庫', opp: 'MVV策定', sub: '事業計画', status: 'Firm', prob: 100, cm: 40, pm: 'Ito', c1: 'Ito', c2: '', rev: [0,0,0,0,0,0,500,500,500,500,500,500] },
  { seq: 53, isNew: false, client: '有限会社大桜', ref: '横浜信用金庫', opp: 'デジタルマーケティング', sub: 'LINE', status: 'Likely', prob: 0, cm: 0, pm: '', c1: '', c2: '', rev: [0,0,0,0,0,0,0,0,0,0,0,0] },
  { seq: 54, isNew: false, client: '有限会社大桜', ref: '横浜信用金庫', opp: 'システム開発', sub: '財務管理システム構築', status: 'Likely', prob: 0, cm: 0, pm: '', c1: '', c2: '', rev: [0,0,0,0,0,0,0,0,0,0,0,0] },
  { seq: 55, isNew: false, client: '有限会社大桜', ref: '横浜信用金庫', opp: 'システム開発', sub: 'コミュニサイト制作', status: 'Likely', prob: 0, cm: 0, pm: '', c1: '', c2: '', rev: [0,0,0,0,0,0,0,0,0,0,0,0] },
  { seq: 30, isNew: true, client: 'ラインロジスティクス株式会社', ref: 'きらぼし銀行', opp: 'Saas', sub: '', status: 'Likely', prob: 50, cm: 0, pm: 'Yasuda', c1: 'Luca', c2: '', rev: [0,0,0,0,0,0,0,0,0,0,0,380] },
  { seq: 57, isNew: true, client: 'ラインロジスティクス株式会社', ref: 'きらぼし銀行', opp: 'DX顧問', sub: '', status: 'Firm', prob: 100, cm: 40, pm: 'Yasuda', c1: 'Yasuda', c2: '', rev: [0,0,0,0,0,150,500,500,500,500,500,500] },
  { seq: 58, isNew: true, client: 'ラインロジスティクス株式会社', ref: 'きらぼし銀行', opp: '補助金支援', sub: '', status: 'Likely', prob: 50, cm: 50, pm: 'Ito', c1: 'Ito', c2: '', rev: [0,0,0,0,0,0,0,0,0,0,0,2250] },
  { seq: 60, isNew: false, client: 'ラインロジスティクス株式会社', ref: 'きらぼし銀行', opp: '開発費', sub: '', status: 'Likely', prob: 50, cm: 0, pm: 'Yasuda', c1: 'Luca', c2: '', rev: [0,0,0,0,0,0,0,0,0,0,0,0] },
  { seq: 2, isNew: false, client: '北海道乳業株式会社', ref: 'きらぼし銀行', opp: 'Amazon支援', sub: 'PH2', status: 'Likely', prob: 30, cm: 50, pm: 'Ito', c1: 'Takimiya', c2: '', rev: [0,0,0,0,0,0,640,640,640,640,640,640] },
  { seq: 63, isNew: false, client: 'イートっぷ', ref: '', opp: '', sub: '', status: 'Likely', prob: 0, cm: 0, pm: 'Ito', c1: 'Takimiya', c2: '', rev: [0,0,0,0,0,100,0,0,0,0,0,0] },
  { seq: 64, isNew: false, client: '岡林釣具', ref: '', opp: '', sub: '', status: 'Likely', prob: 0, cm: 0, pm: 'Ito', c1: 'Takimiya', c2: '', rev: [0,0,0,0,0,0,0,0,300,300,300,300] },
]

const MONTHS = ['2025-10','2025-11','2025-12','2026-01','2026-02','2026-03','2026-04','2026-05','2026-06','2026-07','2026-08','2026-09']

export async function POST() {
  try {
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const supabase = createAdminClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any

    // Get users for name mapping
    const { data: users } = await db.from('users').select('id, name')
    const userMap: Record<string, string> = {}
    for (const u of (users ?? [])) {
      const name = u.name as string
      if (name.includes('伊藤')) userMap['Ito'] = u.id
      if (name.includes('安田')) { userMap['Yasuda'] = u.id; userMap['Yauda'] = u.id }
      if (name.includes('瀧宮')) userMap['Takimiya'] = u.id
      if (name.includes('渡邊') || name.includes('渡辺')) userMap['Watanabe'] = u.id
      if (name.includes('太田')) { userMap['Ota'] = u.id; userMap['太田'] = u.id }
      if (name.includes('Luca') || name.includes('Trabuio')) userMap['Luca'] = u.id
    }

    const resolve = (alias: string): string | null => userMap[alias] ?? null

    let inserted = 0
    for (const row of PIPELINE_DATA) {
      const { data: opp, error: oppErr } = await db.from('pipeline_opportunities').insert({
        seq_id: row.seq,
        is_new: row.isNew,
        client_name: row.client,
        referral_source: row.ref,
        opportunity_name: row.opp,
        sub_opportunity: row.sub,
        status: row.status,
        probability: row.prob,
        cm_percent: row.cm,
        pm_user_id: resolve(row.pm),
        consultant1_user_id: resolve(row.c1),
        consultant2_user_id: resolve(row.c2),
      }).select('id').single()

      if (oppErr) { console.error('Insert opp error:', oppErr.message); continue }

      // Insert monthly data
      const monthlyRows = MONTHS.map((month, i) => ({
        opportunity_id: opp.id,
        month,
        revenue: row.rev[i] ?? 0,
      })).filter(m => m.revenue > 0)

      if (monthlyRows.length > 0) {
        await db.from('pipeline_monthly_data').insert(monthlyRows)
      }
      inserted++
    }

    return NextResponse.json({ success: true, inserted, total: PIPELINE_DATA.length })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
