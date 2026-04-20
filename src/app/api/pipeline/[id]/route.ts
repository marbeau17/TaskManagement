import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const supabase = createAdminClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any

    // Filter to known columns only to prevent errors from missing columns
    const KNOWN_COLS = ['seq_id','is_new','client_type','client_name','referral_source','opportunity_name','sub_opportunity','status','probability','cm_percent','pm_user_id','consultant1_user_id','consultant2_user_id']
    const filtered: Record<string, unknown> = { updated_at: new Date().toISOString() }
    for (const key of KNOWN_COLS) {
      if (key in body) filtered[key] = body[key]
    }

    const { data, error } = await db
      .from('pipeline_opportunities')
      .update(filtered)
      .eq('id', id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Keep CRM in lockstep when client_name or status changes (cheap to run for any edit — it's idempotent).
    if ('client_name' in filtered || 'status' in filtered) {
      const { syncPipelineToCrm } = await import('@/lib/data/pipeline-crm-sync')
      await syncPipelineToCrm(db, data)
    }

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any

    const { error } = await db
      .from('pipeline_opportunities')
      .delete()
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
