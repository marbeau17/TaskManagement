import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { dealTitle, stage, amount, owner_id } = await request.json()
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const supabase = createAdminClient()
    const db = supabase as any

    // 1. Create crm_deals record
    const dealPayload: Record<string, unknown> = { title: dealTitle, lead_id: id }
    if (stage) dealPayload.stage = stage
    if (amount !== undefined) dealPayload.amount = amount
    if (owner_id) dealPayload.owner_id = owner_id

    const { data: deal, error: dealError } = await db
      .from('crm_deals')
      .insert(dealPayload)
      .select('*')
      .single()

    if (dealError) return NextResponse.json({ error: dealError.message }, { status: 500 })

    // 2. Update crm_leads: status='converted', converted_deal_id, converted_at
    const { data: lead, error: leadError } = await db
      .from('crm_leads')
      .update({
        status: 'converted',
        converted_deal_id: deal.id,
        converted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single()

    if (leadError) return NextResponse.json({ error: leadError.message }, { status: 500 })

    // 3. Return both
    return NextResponse.json({ deal, lead })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
