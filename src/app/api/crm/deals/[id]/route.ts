import { NextRequest, NextResponse } from 'next/server'

const SELECT = '*, company:crm_companies(id, name), contact:crm_contacts(id, first_name, last_name, email), owner:users!crm_deals_owner_id_fkey(id, name, avatar_color), items:crm_deal_items(*)'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const db = createAdminClient() as any

    const { data, error } = await db
      .from('crm_deals')
      .select(SELECT)
      .eq('id', id)
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 404 })
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const db = createAdminClient() as any

    const { data, error } = await db
      .from('crm_deals')
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select(SELECT)
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const db = createAdminClient() as any

    const { error } = await db.from('crm_deals').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
