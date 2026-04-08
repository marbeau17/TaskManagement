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

    // 0. Fetch the lead to carry over fields (e.g. sales_contribution)
    const { data: leadData, error: leadFetchError } = await db
      .from('crm_leads')
      .select('*')
      .eq('id', id)
      .single()

    if (leadFetchError) return NextResponse.json({ error: leadFetchError.message }, { status: 500 })

    // 1. Create crm_deals record
    const dealPayload: Record<string, unknown> = { title: dealTitle, lead_id: id }
    if (stage) dealPayload.stage = stage
    if (amount !== undefined) dealPayload.amount = amount
    if (owner_id) dealPayload.owner_id = owner_id
    dealPayload.sales_contribution = leadData.sales_contribution ?? 0

    const { data: deal, error: dealError } = await db
      .from('crm_deals')
      .insert(dealPayload)
      .select('*')
      .single()

    if (dealError) return NextResponse.json({ error: dealError.message }, { status: 500 })

    // 2. Create a project from the lead title
    const stripped = (dealTitle || '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 3).toUpperCase()
    const keyPrefix = stripped.length >= 2 ? stripped : 'PRJ'
    const projectPayload: Record<string, unknown> = {
      name: dealTitle,
      description: `CRMリード「${dealTitle}」から自動作成`,
      status: 'planning',
      key_prefix: keyPrefix,
    }
    if (owner_id) projectPayload.pm_id = owner_id

    const { data: project, error: projectError } = await db
      .from('projects')
      .insert(projectPayload)
      .select('*')
      .single()

    if (projectError) return NextResponse.json({ error: projectError.message }, { status: 500 })

    // 3. Link the deal to the project
    const { error: linkError } = await db
      .from('crm_deals')
      .update({ project_id: project.id })
      .eq('id', deal.id)

    if (linkError) return NextResponse.json({ error: linkError.message }, { status: 500 })

    // 4. Update crm_leads: status='converted', converted_deal_id, converted_at
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

    // 5. Return deal, project, and lead
    return NextResponse.json({ deal, project, lead })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
