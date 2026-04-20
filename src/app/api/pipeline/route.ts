import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const supabase = createAdminClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any

    const { data: opportunities, error } = await db
      .from('pipeline_opportunities')
      .select('*, monthly:pipeline_monthly_data(*)')
      .order('seq_id', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(opportunities ?? [])
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const supabase = createAdminClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any

    const { data, error } = await db
      .from('pipeline_opportunities')
      .insert(body)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const { syncPipelineToCrm } = await import('@/lib/data/pipeline-crm-sync')
    await syncPipelineToCrm(db, data)

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
