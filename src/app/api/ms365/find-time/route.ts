import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { member_ids, duration_minutes, date } = await request.json()

    if (!member_ids?.length || !duration_minutes || !date) {
      return NextResponse.json({ error: 'member_ids, duration_minutes, and date are required' }, { status: 400 })
    }

    const { createAdminClient } = await import('@/lib/supabase/admin')
    const db = createAdminClient() as any

    // Get all events for the given date for all members
    const { data: events } = await db
      .from('calendar_events')
      .select('user_id, start_at, end_at, show_as')
      .in('user_id', member_ids)
      .gte('start_at', date + 'T00:00:00')
      .lte('end_at', date + 'T23:59:59')
      .eq('is_cancelled', false)
      .neq('show_as', 'free')

    // Get task assignments for the date
    const { data: tasks } = await db
      .from('tasks')
      .select('assigned_to, confirmed_deadline, estimated_hours, status')
      .in('assigned_to', member_ids)
      .not('status', 'in', '(done,rejected)')

    // Working hours (JST): configurable, default 9:00-18:00
    const workStartHour = parseInt(request.headers.get('x-work-start') || '9')
    const workEndHour = parseInt(request.headers.get('x-work-end') || '18')
    const workStart = workStartHour * 60
    const workEnd = workEndHour * 60
    const lunchStart = 12 * 60
    const lunchEnd = 13 * 60

    // Generate candidate slots in JST (every 30 minutes)
    const slots: any[] = []
    for (let m = workStart; m + duration_minutes <= workEnd; m += 30) {
      // Skip lunch
      if (m < lunchEnd && m + duration_minutes > lunchStart) continue

      const hour = Math.floor(m / 60)
      const min = m % 60
      const slotStartJST = `${date}T${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}:00+09:00`
      const slotEndMin = m + duration_minutes
      const endHour = Math.floor(slotEndMin / 60)
      const endMin = slotEndMin % 60
      const slotEndJST = `${date}T${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}:00+09:00`

      const slotStartMs = new Date(slotStartJST).getTime()
      const slotEndMs = new Date(slotEndJST).getTime()

      // Check each member's availability
      const available: string[] = []
      const unavailable: string[] = []

      for (const memberId of member_ids) {
        const memberEvents = (events ?? []).filter((e: any) => e.user_id === memberId)
        const hasConflict = memberEvents.some((e: any) => {
          const eStart = new Date(e.start_at).getTime()
          const eEnd = new Date(e.end_at).getTime()
          return slotStartMs < eEnd && slotEndMs > eStart
        })
        if (hasConflict) unavailable.push(memberId)
        else available.push(memberId)
      }

      const availRatio = available.length / member_ids.length
      const hourOfDay = hour
      const timePreference = hourOfDay >= 10 && hourOfDay <= 11 ? 1.1
        : hourOfDay >= 14 && hourOfDay <= 15 ? 1.05
        : 1.0

      slots.push({
        start: slotStartJST,
        end: slotEndJST,
        duration_minutes,
        available_members: available,
        unavailable_members: unavailable,
        score: Math.round(availRatio * timePreference * 100),
      })
    }

    slots.sort((a, b) => b.score - a.score || new Date(a.start).getTime() - new Date(b.start).getTime())
    return NextResponse.json({ slots: slots.slice(0, 10), date, member_count: member_ids.length })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
