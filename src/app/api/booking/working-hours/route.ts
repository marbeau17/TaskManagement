import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

type DayRow = {
  day_of_week: number
  start_time: string
  end_time: string
  is_active: boolean
}

const DEFAULT_HOURS: DayRow[] = [
  { day_of_week: 0, start_time: '10:00', end_time: '17:00', is_active: false }, // Sun
  { day_of_week: 1, start_time: '10:00', end_time: '17:00', is_active: true },  // Mon
  { day_of_week: 2, start_time: '10:00', end_time: '17:00', is_active: true },  // Tue
  { day_of_week: 3, start_time: '10:00', end_time: '17:00', is_active: true },  // Wed
  { day_of_week: 4, start_time: '10:00', end_time: '17:00', is_active: true },  // Thu
  { day_of_week: 5, start_time: '10:00', end_time: '17:00', is_active: true },  // Fri
  { day_of_week: 6, start_time: '10:00', end_time: '17:00', is_active: false }, // Sat
]

async function getCaller() {
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { user: null, role: null as string | null }
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase as any)
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()
  return { user, role: (profile?.role as string | undefined) ?? null }
}

// GET /api/booking/working-hours?user_id=X
export async function GET(request: NextRequest) {
  try {
    const caller = await getCaller()
    if (!caller.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')
    if (!userId) return NextResponse.json({ error: 'user_id required' }, { status: 400 })

    const { createAdminClient } = await import('@/lib/supabase/admin')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createAdminClient() as any

    const { data, error } = await db
      .from('booking_working_hours')
      .select('day_of_week, start_time, end_time, is_active')
      .eq('user_id', userId)
      .order('day_of_week', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    if (!data || data.length === 0) {
      return NextResponse.json(DEFAULT_HOURS)
    }

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

// PUT /api/booking/working-hours — replace all rows for a user.
// Self-update allowed; updating another user's hours requires admin/director.
export async function PUT(request: NextRequest) {
  try {
    const caller = await getCaller()
    if (!caller.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const targetUserId: unknown = body?.user_id
    const hours: unknown = body?.hours

    if (typeof targetUserId !== 'string' || !targetUserId) {
      return NextResponse.json({ error: 'user_id required' }, { status: 400 })
    }
    if (!Array.isArray(hours)) {
      return NextResponse.json({ error: 'hours must be an array' }, { status: 400 })
    }

    // Permission: self-update OR admin/director.
    const isSelf = caller.user.id === targetUserId
    const isAdmin = caller.role === 'admin' || caller.role === 'director'
    if (!isSelf && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Validate rows.
    const rows: DayRow[] = []
    for (const raw of hours) {
      if (!raw || typeof raw !== 'object') {
        return NextResponse.json({ error: 'Invalid hour row' }, { status: 400 })
      }
      const r = raw as Record<string, unknown>
      const dow = Number(r.day_of_week)
      if (!Number.isInteger(dow) || dow < 0 || dow > 6) {
        return NextResponse.json({ error: 'day_of_week must be 0-6' }, { status: 400 })
      }
      if (typeof r.start_time !== 'string' || typeof r.end_time !== 'string') {
        return NextResponse.json({ error: 'start_time/end_time must be strings' }, { status: 400 })
      }
      rows.push({
        day_of_week: dow,
        start_time: r.start_time,
        end_time: r.end_time,
        is_active: Boolean(r.is_active),
      })
    }

    const { createAdminClient } = await import('@/lib/supabase/admin')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createAdminClient() as any

    // Delete then insert. booking_working_hours has no single PK surrogate; we can also upsert,
    // but delete-then-insert matches the spec and is simpler to reason about.
    const { error: delErr } = await db
      .from('booking_working_hours')
      .delete()
      .eq('user_id', targetUserId)

    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 })

    if (rows.length > 0) {
      const insertRows = rows.map((r) => ({ ...r, user_id: targetUserId }))
      const { error: insErr } = await db.from('booking_working_hours').insert(insertRows)
      if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, count: rows.length })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
