import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const user_id = searchParams.get('user_id')
    const start_date = searchParams.get('start_date') // yyyy-MM-dd
    const end_date = searchParams.get('end_date')
    const viewer_id = searchParams.get('viewer_id') // who is viewing

    const { createAdminClient } = await import('@/lib/supabase/admin')
    const db = createAdminClient() as any

    let query = db
      .from('calendar_events')
      .select('*')
      .eq('is_cancelled', false)
      .order('start_at', { ascending: true })

    if (user_id) query = query.eq('user_id', user_id)
    if (start_date) query = query.gte('start_at', start_date + 'T00:00:00')
    if (end_date) query = query.lte('end_at', end_date + 'T23:59:59')

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Privacy filter: hide private event details from non-owners
    const events = (data ?? []).map((evt: any) => {
      if (viewer_id && viewer_id !== evt.user_id &&
          (evt.sensitivity === 'private' || evt.sensitivity === 'confidential')) {
        return {
          ...evt,
          subject: 'ブロック済み',
          location: '',
          organizer_name: '',
          organizer_email: '',
        }
      }
      return evt
    })

    return NextResponse.json(events)
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
