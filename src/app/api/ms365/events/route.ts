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
    console.log('[API /ms365/events] Query params:', { user_id, start_date, end_date, viewer_id })
    console.log('[API /ms365/events] DB result: count=', data?.length ?? 0, 'error=', error?.message ?? 'none')
    if (data?.length) {
      data.forEach((evt: any, i: number) => {
        console.log(`[API /ms365/events] Row[${i}]:`, {
          id: evt.id, user_id: evt.user_id, subject: evt.subject,
          start_at: evt.start_at, end_at: evt.end_at,
          is_cancelled: evt.is_cancelled, show_as: evt.show_as,
          response_status: evt.response_status,
        })
      })
    }
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const db = createAdminClient() as any

    const event = {
      user_id: body.user_id,
      ms_event_id: 'manual-' + Date.now(),
      subject: body.subject ?? '',
      start_at: body.start_at,
      end_at: body.end_at,
      duration_minutes: body.duration_minutes ?? 30,
      sensitivity: body.sensitivity ?? 'normal',
      show_as: body.show_as ?? 'busy',
      organizer_name: body.organizer_name ?? '',
      location: body.location ?? '',
      response_status: 'organizer',
    }

    const { data, error } = await db.from('calendar_events').insert(event).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
