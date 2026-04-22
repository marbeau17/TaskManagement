import { NextRequest, NextResponse } from 'next/server'
import { normalizeDealBody } from '@/lib/crm/normalize-deal'

const SELECT = '*, company:crm_companies(id, name), contact:crm_contacts(id, first_name, last_name, email), owner:users!crm_deals_owner_id_fkey(id, name, avatar_color), items:crm_deal_items(*)'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q')
    const company_id = searchParams.get('company_id')
    const owner_id = searchParams.get('owner_id')
    const stage = searchParams.get('stage')
    const priority = searchParams.get('priority')
    const page = parseInt(searchParams.get('page') ?? '1')
    const pageSize = parseInt(searchParams.get('pageSize') ?? '20')

    const { createAdminClient } = await import('@/lib/supabase/admin')
    const db = createAdminClient() as any

    let query = db
      .from('crm_deals')
      .select(SELECT, { count: 'exact' })
      .order('created_at', { ascending: false })

    if (q) query = query.ilike('title', `%${q}%`)
    if (company_id) query = query.eq('company_id', company_id)
    if (owner_id) query = query.eq('owner_id', owner_id)
    if (stage) {
      const stages = stage.split(',').map((s) => s.trim())
      query = stages.length === 1 ? query.eq('stage', stages[0]) : query.in('stage', stages)
    }
    if (priority) query = query.eq('priority', priority)

    const from = (page - 1) * pageSize
    query = query.range(from, from + pageSize - 1)

    const { data, error, count } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data: data ?? [], total: count ?? 0, page, pageSize })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const normalized = normalizeDealBody(body)
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const db = createAdminClient() as any

    const { data, error } = await db
      .from('crm_deals')
      .insert(normalized)
      .select(SELECT)
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
