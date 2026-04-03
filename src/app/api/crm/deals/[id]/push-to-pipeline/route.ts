import { NextRequest, NextResponse } from 'next/server'

export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: dealId } = await params
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const db = createAdminClient() as any

    // 1. Get the CRM deal with company
    const { data: deal, error: dealError } = await db
      .from('crm_deals')
      .select('*, company:crm_companies(id, name, client_id)')
      .eq('id', dealId)
      .single()

    if (dealError || !deal) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
    }

    // 2. Check if already linked to pipeline
    if (deal.pipeline_opportunity_id) {
      return NextResponse.json({ error: 'Deal already linked to pipeline', pipeline_id: deal.pipeline_opportunity_id }, { status: 409 })
    }

    // 3. Get next seq_id
    const { data: maxSeq } = await db
      .from('pipeline_opportunities')
      .select('seq_id')
      .order('seq_id', { ascending: false })
      .limit(1)
      .single()
    const nextSeqId = (maxSeq?.seq_id ?? 0) + 1

    // 4. Map CRM deal stage to pipeline status
    const stageToStatus: Record<string, string> = {
      proposal: 'Likely',
      negotiation: 'Likely',
      contract_sent: 'Firm',
      won: 'Win',
      lost: 'Lost',
      churned: 'Lost',
    }

    // 5. Create pipeline opportunity
    const pipelineData = {
      seq_id: nextSeqId,
      is_new: true,
      client_name: deal.company?.name ?? deal.title,
      client_type: 'Prospect',
      opportunity_name: deal.title,
      status: stageToStatus[deal.stage] ?? 'Likely',
      probability: deal.probability ?? 0,
      pm_user_id: deal.owner_id,
    }

    const { data: pipeline, error: pipelineError } = await db
      .from('pipeline_opportunities')
      .insert(pipelineData)
      .select()
      .single()

    if (pipelineError) {
      return NextResponse.json({ error: pipelineError.message }, { status: 500 })
    }

    // 6. Link deal to pipeline opportunity
    await db
      .from('crm_deals')
      .update({ pipeline_opportunity_id: pipeline.id, updated_at: new Date().toISOString() })
      .eq('id', dealId)

    // 7. Create initial monthly revenue data (spread amount across expected months)
    if (deal.amount > 0 && deal.expected_close_date) {
      const closeMonth = deal.expected_close_date.slice(0, 7) // YYYY-MM
      await db.from('pipeline_monthly_data').insert({
        opportunity_id: pipeline.id,
        month: closeMonth,
        revenue: deal.amount / 1000, // pipeline uses thousands
        revenue_plan: (deal.amount / 1000) * (deal.probability / 100),
      }).catch(() => {})
    }

    // 8. Create CRM activity
    await db.from('crm_activities').insert({
      entity_type: 'deal',
      entity_id: dealId,
      activity_type: 'system',
      subject: 'パイプラインにプッシュ',
      body: `Pipeline #${nextSeqId} として登録されました。ステータス: ${pipelineData.status}`,
      user_id: deal.owner_id,
      is_completed: true,
      completed_at: new Date().toISOString(),
    }).catch(() => {})

    return NextResponse.json({
      success: true,
      pipeline_id: pipeline.id,
      pipeline_seq_id: nextSeqId,
      deal_id: dealId,
    })
  } catch (error) {
    console.error('[Push to Pipeline]', error)
    return NextResponse.json({ error: 'Failed to push to pipeline' }, { status: 500 })
  }
}
