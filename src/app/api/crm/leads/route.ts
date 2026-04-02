import { NextRequest, NextResponse } from 'next/server'

const SELECT = '*, contact:crm_contacts(id, first_name, last_name, email), company:crm_companies(id, name), owner:users!crm_leads_owner_id_fkey(id, name, avatar_color)'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q')
    const status = searchParams.get('status')
    const owner_id = searchParams.get('owner_id')
    const page = parseInt(searchParams.get('page') ?? '1')
    const pageSize = parseInt(searchParams.get('pageSize') ?? '20')

    const { createAdminClient } = await import('@/lib/supabase/admin')
    const supabase = createAdminClient()
    const db = supabase as any

    let query = db
      .from('crm_leads')
      .select(SELECT, { count: 'exact' })
      .order('created_at', { ascending: false })

    if (q) query = query.ilike('title', `%${q}%`)
    if (status) query = query.eq('status', status)
    if (owner_id) query = query.eq('owner_id', owner_id)

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
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const supabase = createAdminClient()
    const db = supabase as any

    const { data, error } = await db
      .from('crm_leads')
      .insert(body)
      .select(SELECT)
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
