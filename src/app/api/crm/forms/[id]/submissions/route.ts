import { NextRequest, NextResponse } from 'next/server'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const db = createAdminClient() as any
    const { data, error } = await db
      .from('crm_form_submissions')
      .select('*, contact:crm_contacts(id, first_name, last_name, email)')
      .eq('form_id', id)
      .order('created_at', { ascending: false })
      .limit(100)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data ?? [])
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
