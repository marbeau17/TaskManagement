import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const db = createAdminClient() as any

    // Get first admin user for owner_id
    const { data: admin } = await db.from('users').select('id').eq('role', 'admin').limit(1).single()
    const ownerId = admin?.id ?? null

    // Insert companies
    const { data: companies } = await db.from('crm_companies').insert([
      { name: '株式会社テックイノベーション', domain: 'techinno.co.jp', industry: 'IT', company_size: '51-200', owner_id: ownerId, source: 'referral' },
      { name: 'グローバルメディア株式会社', domain: 'globalmedia.jp', industry: 'メディア', company_size: '11-50', owner_id: ownerId, source: 'website' },
      { name: '東京ファイナンス株式会社', domain: 'tokyofinance.co.jp', industry: '金融', company_size: '201-1000', owner_id: ownerId, source: 'event' },
      { name: 'スマートリテール株式会社', domain: 'smartretail.jp', industry: '小売', company_size: '1-10', owner_id: ownerId, source: 'outbound' },
      { name: 'デジタルヘルス株式会社', domain: 'digitalhealth.co.jp', industry: 'ヘルスケア', company_size: '11-50', owner_id: ownerId, source: 'referral' },
    ]).select('id, name')

    if (!companies || companies.length < 5) {
      return NextResponse.json({ error: 'Failed to create companies' }, { status: 500 })
    }

    // Insert contacts
    const { data: contacts } = await db.from('crm_contacts').insert([
      { company_id: companies[0].id, first_name: '太郎', last_name: '田中', email: 'tanaka@techinno.co.jp', title: 'CTO', lifecycle_stage: 'sql', lead_score: 85, owner_id: ownerId },
      { company_id: companies[0].id, first_name: '花子', last_name: '鈴木', email: 'suzuki@techinno.co.jp', title: '部長', lifecycle_stage: 'mql', lead_score: 62, owner_id: ownerId },
      { company_id: companies[1].id, first_name: '一郎', last_name: '佐藤', email: 'sato@globalmedia.jp', title: '代表取締役', lifecycle_stage: 'opportunity', lead_score: 90, owner_id: ownerId },
      { company_id: companies[1].id, first_name: '美紀', last_name: '山田', email: 'yamada@globalmedia.jp', title: 'マーケティング部長', lifecycle_stage: 'lead', lead_score: 45, owner_id: ownerId },
      { company_id: companies[2].id, first_name: '健一', last_name: '渡辺', email: 'watanabe@tokyofinance.co.jp', title: 'IT部門長', lifecycle_stage: 'customer', lead_score: 95, owner_id: ownerId },
      { company_id: companies[2].id, first_name: '洋子', last_name: '高橋', email: 'takahashi@tokyofinance.co.jp', title: '営業部長', lifecycle_stage: 'sql', lead_score: 78, owner_id: ownerId },
      { company_id: companies[3].id, first_name: '大輔', last_name: '伊藤', email: 'ito@smartretail.jp', title: 'CEO', lifecycle_stage: 'lead', lead_score: 55, owner_id: ownerId },
      { company_id: companies[3].id, first_name: 'さくら', last_name: '中村', email: 'nakamura@smartretail.jp', title: '店舗運営部長', lifecycle_stage: 'subscriber', lead_score: 20, owner_id: ownerId },
      { company_id: companies[4].id, first_name: '誠', last_name: '小林', email: 'kobayashi@digitalhealth.co.jp', title: 'CTO', lifecycle_stage: 'mql', lead_score: 68, owner_id: ownerId },
      { company_id: companies[4].id, first_name: 'あかり', last_name: '吉田', email: 'yoshida@digitalhealth.co.jp', title: 'PM', lifecycle_stage: 'lead', lead_score: 40, owner_id: ownerId },
    ]).select('id')

    // Insert deals
    const { data: deals } = await db.from('crm_deals').insert([
      { title: 'テックイノベーション AI ダッシュボード', company_id: companies[0].id, contact_id: contacts?.[0]?.id, stage: 'proposal', amount: 5000000, probability: 60, expected_close_date: '2026-05-15', owner_id: ownerId, priority: 'high' },
      { title: '東京ファイナンス 業務自動化', company_id: companies[2].id, contact_id: contacts?.[4]?.id, stage: 'negotiation', amount: 10000000, probability: 75, expected_close_date: '2026-04-30', owner_id: ownerId, priority: 'critical' },
      { title: 'スマートリテール EC構築', company_id: companies[3].id, contact_id: contacts?.[6]?.id, stage: 'contract_sent', amount: 3500000, probability: 90, expected_close_date: '2026-04-20', owner_id: ownerId, priority: 'high' },
      { title: 'グローバルメディア マーケティング支援', company_id: companies[1].id, contact_id: contacts?.[2]?.id, stage: 'won', amount: 2000000, probability: 100, expected_close_date: '2026-03-31', actual_close_date: '2026-03-28', owner_id: ownerId, priority: 'medium' },
    ]).select('id')

    // Insert leads
    await db.from('crm_leads').insert([
      { title: 'テックイノベーション AI導入案件', contact_id: contacts?.[1]?.id, company_id: companies[0].id, status: 'qualified', source: 'referral', estimated_value: 5000000, owner_id: ownerId, expected_close_date: '2026-06-30' },
      { title: 'グローバルメディア SNSキャンペーン', contact_id: contacts?.[3]?.id, company_id: companies[1].id, status: 'contacted', source: 'website', estimated_value: 2000000, owner_id: ownerId },
      { title: '東京ファイナンス DX推進', contact_id: contacts?.[5]?.id, company_id: companies[2].id, status: 'new', source: 'event', estimated_value: 10000000, owner_id: ownerId },
      { title: 'スマートリテール ECサイト構築', contact_id: contacts?.[7]?.id, company_id: companies[3].id, status: 'qualified', source: 'cold_call', estimated_value: 3500000, owner_id: ownerId },
      { title: 'デジタルヘルス アプリ開発', contact_id: contacts?.[8]?.id, company_id: companies[4].id, status: 'new', source: 'referral', estimated_value: 8000000, owner_id: ownerId },
    ])

    // Insert activities
    const now = new Date()
    await db.from('crm_activities').insert([
      { entity_type: 'deal', entity_id: deals?.[0]?.id, activity_type: 'meeting', subject: '初回提案ミーティング', body: 'AI導入の要件定義について議論。次回技術詳細を提示予定。', user_id: ownerId, is_completed: true, completed_at: new Date(now.getTime() - 2 * 86400000).toISOString() },
      { entity_type: 'deal', entity_id: deals?.[1]?.id, activity_type: 'call', subject: '価格交渉フォローアップ', body: '予算承認待ち。来週結論予定。', outcome: '継続検討', user_id: ownerId, is_completed: true, completed_at: new Date(now.getTime() - 1 * 86400000).toISOString() },
      { entity_type: 'deal', entity_id: deals?.[2]?.id, activity_type: 'email', subject: '契約書送付', body: '最終契約書をメールで送付。署名待ち。', user_id: ownerId, is_completed: true, completed_at: now.toISOString() },
      { entity_type: 'contact', entity_id: contacts?.[0]?.id, activity_type: 'note', subject: 'キーパーソン情報', body: 'CTOの田中氏がAI導入の主導者。技術的な判断権を持つ。', user_id: ownerId },
      { entity_type: 'contact', entity_id: contacts?.[2]?.id, activity_type: 'meeting', subject: '経営層プレゼン', body: '佐藤代表へ直接提案。非常に好感触。', user_id: ownerId, is_completed: true, completed_at: new Date(now.getTime() - 5 * 86400000).toISOString() },
      { entity_type: 'company', entity_id: companies[0].id, activity_type: 'note', subject: '企業メモ', body: 'AI活用に積極的。年間IT投資予算10億円規模。', user_id: ownerId },
      { entity_type: 'company', entity_id: companies[2].id, activity_type: 'call', subject: 'DX推進部署ヒアリング', body: '来年度のDX予算確保に向けて情報収集中。', user_id: ownerId, is_completed: true, completed_at: new Date(now.getTime() - 3 * 86400000).toISOString() },
      { entity_type: 'lead', entity_id: null, activity_type: 'system', subject: 'リード自動作成', body: 'Webフォームからのリードが自動登録されました。', user_id: ownerId },
      { entity_type: 'deal', entity_id: deals?.[3]?.id, activity_type: 'stage_change', subject: '成約', body: 'マーケティング支援契約が正式に成立。', user_id: ownerId, is_completed: true, completed_at: new Date(now.getTime() - 4 * 86400000).toISOString() },
      { entity_type: 'contact', entity_id: contacts?.[4]?.id, activity_type: 'email', subject: '定例ミーティング案内', body: '月次レビューのスケジュール調整。', user_id: ownerId },
    ])

    return NextResponse.json({
      success: true,
      created: {
        companies: companies.length,
        contacts: contacts?.length ?? 0,
        deals: deals?.length ?? 0,
        leads: 5,
        activities: 10,
      }
    })
  } catch (error) {
    console.error('[CRM Seed]', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
