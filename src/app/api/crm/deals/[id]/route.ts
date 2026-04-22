import { NextRequest, NextResponse } from 'next/server'
import { normalizeDealBody } from '@/lib/crm/normalize-deal'

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

    // Fetch current row when caller is mutating any amount-related field but
    // omits the others — normalizeDealBody needs the full triple to recalc.
    let current: any = undefined
    const touchesAmount =
      'one_time_amount' in body ||
      'monthly_recurring_amount' in body ||
      'contract_term_months' in body ||
      'tcv' in body ||
      'deal_type' in body
    if (touchesAmount) {
      const { data: row } = await db
        .from('crm_deals')
        .select('deal_type, one_time_amount, monthly_recurring_amount, contract_term_months, tcv')
        .eq('id', id)
        .single()
      current = row ?? undefined
    }

    const normalized = normalizeDealBody(body, current)

    const { data, error } = await db
      .from('crm_deals')
      .update({ ...normalized, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select(SELECT)
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    try {
      const { syncDealToPipeline } = await import('@/lib/data/pipeline-crm-sync')
      await syncDealToPipeline(db, data)
    } catch (syncErr) {
      console.warn('[crm/deals PATCH] pipeline sync skipped:', syncErr)
    }

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
