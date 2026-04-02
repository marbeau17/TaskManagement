import { NextRequest, NextResponse } from 'next/server'

const SELECT = '*, contact:crm_contacts(id, first_name, last_name, email), company:crm_companies(id, name), owner:users!crm_leads_owner_id_fkey(id, name, avatar_color)'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const supabase = createAdminClient()
    const db = supabase as any

    const { data, error } = await db
      .from('crm_leads')
      .select(SELECT)
      .eq('id', id)
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const supabase = createAdminClient()
    const db = supabase as any

    const { data, error } = await db
      .from('crm_leads')
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const supabase = createAdminClient()
    const db = supabase as any

    const { error } = await db
      .from('crm_leads')
      .delete()
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
