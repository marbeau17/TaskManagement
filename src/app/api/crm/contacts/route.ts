import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q')
    const company_id = searchParams.get('company_id')
    const owner_id = searchParams.get('owner_id')
    const lifecycle_stage = searchParams.get('lifecycle_stage')
    const lead_status = searchParams.get('lead_status')
    const page = parseInt(searchParams.get('page') ?? '1')
    const pageSize = parseInt(searchParams.get('pageSize') ?? '20')

    const { createAdminClient } = await import('@/lib/supabase/admin')
    const supabase = createAdminClient()
    const db = supabase as any

    let query = db
      .from('crm_contacts')
      .select('*, company:crm_companies(id, name), owner:users!crm_contacts_owner_id_fkey(id, name, avatar_color)', { count: 'exact' })
      .order('created_at', { ascending: false })

    if (q) query = query.or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,email.ilike.%${q}%`)
    if (company_id) query = query.eq('company_id', company_id)
    if (owner_id) query = query.eq('owner_id', owner_id)
    if (lifecycle_stage) query = query.eq('lifecycle_stage', lifecycle_stage)
    if (lead_status) query = query.eq('lead_status', lead_status)

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
      .from('crm_contacts')
      .insert(body)
      .select('*, company:crm_companies(id, name), owner:users!crm_contacts_owner_id_fkey(id, name, avatar_color)')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
