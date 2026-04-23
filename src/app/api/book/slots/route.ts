import { NextRequest, NextResponse } from 'next/server'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders })
}

// ---------------------------------------------------------------------------
// JST-aware helpers. We treat all local wall-clock times as JST (+09:00).
// ---------------------------------------------------------------------------
const JST_OFFSET_MIN = 9 * 60

/** Turn "YYYY-MM-DD" + "HH:MM" (JST) into an absolute Date. */
function jstDateTimeToUtc(dateStr: string, timeStr: string): Date {
  // Appending +09:00 makes the string a valid JST ISO datetime.
  return new Date(`${dateStr}T${timeStr.length === 5 ? timeStr + ':00' : timeStr}+09:00`)
}

/** YYYY-MM-DD (JST) for a given Date. */
function toJstDateString(d: Date): string {
  const jst = new Date(d.getTime() + JST_OFFSET_MIN * 60_000)
  const y = jst.getUTCFullYear()
  const m = String(jst.getUTCMonth() + 1).padStart(2, '0')
  const day = String(jst.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** 0=Sun .. 6=Sat, in JST. */
function jstDayOfWeek(dateStr: string): number {
  const d = new Date(`${dateStr}T00:00:00+09:00`)
  // getUTCDay() on the +09:00 moment yields JST day because we anchored it there.
  // Actually simpler: construct by parts.
  const [y, m, day] = dateStr.split('-').map(Number)
  // Date.UTC treats args as UTC; weekday of Y-M-D in any timezone is the same value.
  return new Date(Date.UTC(y, m - 1, day)).getUTCDay()
}

/** Round up UTC date to next 15-min boundary in JST wall-clock. */
function ceilTo15JST(d: Date): Date {
  const jstMs = d.getTime() + JST_OFFSET_MIN * 60_000
  const step = 15 * 60_000
  const ceiled = Math.ceil(jstMs / step) * step
  return new Date(ceiled - JST_OFFSET_MIN * 60_000)
}

interface BusyInterval {
  start: number // UTC ms
  end: number
}

/** Merge overlapping busy intervals. */
function mergeIntervals(intervals: BusyInterval[]): BusyInterval[] {
  if (intervals.length === 0) return []
  const sorted = [...intervals].sort((a, b) => a.start - b.start)
  const out: BusyInterval[] = [sorted[0]]
  for (let i = 1; i < sorted.length; i++) {
    const last = out[out.length - 1]
    const cur = sorted[i]
    if (cur.start <= last.end) {
      last.end = Math.max(last.end, cur.end)
    } else {
      out.push(cur)
    }
  }
  return out
}

/** Subtract busy intervals from a single working window → list of free intervals. */
function subtractBusy(windowStart: number, windowEnd: number, busy: BusyInterval[]): BusyInterval[] {
  const free: BusyInterval[] = []
  let cursor = windowStart
  for (const b of busy) {
    if (b.end <= cursor) continue
    if (b.start >= windowEnd) break
    if (b.start > cursor) {
      free.push({ start: cursor, end: Math.min(b.start, windowEnd) })
    }
    cursor = Math.max(cursor, b.end)
    if (cursor >= windowEnd) break
  }
  if (cursor < windowEnd) free.push({ start: cursor, end: windowEnd })
  return free
}

/** All dates from start to end (JST-aware), inclusive. */
function enumerateDates(fromStr: string, toStr: string, cap = 60): string[] {
  const result: string[] = []
  const start = new Date(`${fromStr}T00:00:00+09:00`)
  const end = new Date(`${toStr}T00:00:00+09:00`)
  let count = 0
  for (let t = start.getTime(); t <= end.getTime() && count < cap; t += 86_400_000) {
    result.push(toJstDateString(new Date(t)))
    count++
  }
  return result
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const slug = searchParams.get('slug')
    const fromRaw = searchParams.get('from')
    const toRaw = searchParams.get('to')

    if (!slug) {
      return NextResponse.json({ error: 'slug is required' }, { status: 400, headers: corsHeaders })
    }

    const todayJst = toJstDateString(new Date())
    const from = fromRaw && /^\d{4}-\d{2}-\d{2}$/.test(fromRaw) ? fromRaw : todayJst
    // Cap end to 60 days from today.
    const maxEnd = toJstDateString(new Date(Date.now() + 60 * 86_400_000))
    let to = toRaw && /^\d{4}-\d{2}-\d{2}$/.test(toRaw) ? toRaw : maxEnd
    if (to > maxEnd) to = maxEnd
    if (from > to) {
      return NextResponse.json([], { headers: corsHeaders })
    }

    const { createAdminClient } = await import('@/lib/supabase/admin')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createAdminClient() as any

    // 1. Load category
    const { data: category } = await db
      .from('booking_categories')
      .select('id, slug, title, duration_min, buffer_min, is_public')
      .eq('slug', slug)
      .maybeSingle()
    if (!category || !category.is_public) {
      return NextResponse.json({ error: 'category_not_found' }, { status: 404, headers: corsHeaders })
    }

    const chunkLen = category.duration_min + (category.buffer_min || 0) // minutes
    const bookingLen = category.duration_min // actual meeting length (slot window end)

    // 2. Load consultant user_ids for this category
    const { data: consultantRows } = await db
      .from('booking_category_consultants')
      .select('user_id')
      .eq('category_id', category.id)
    const consultantIds: string[] = (consultantRows ?? []).map((r: { user_id: string }) => r.user_id)
    if (consultantIds.length === 0) {
      return NextResponse.json([], { headers: corsHeaders })
    }

    // 3. Which consultants have MS365 connected?
    const { data: msRows } = await db
      .from('ms365_tokens')
      .select('user_id')
      .in('user_id', consultantIds)
    const ms365Connected = new Set<string>((msRows ?? []).map((r: { user_id: string }) => r.user_id))

    // 4a. Working hours per user for the whole range (one fetch).
    const { data: whRows } = await db
      .from('booking_working_hours')
      .select('user_id, day_of_week, start_time, end_time, is_active')
      .in('user_id', consultantIds)
      .eq('is_active', true)
    type Wh = { user_id: string; day_of_week: number; start_time: string; end_time: string }
    const whByUser = new Map<string, Map<number, Wh>>()
    const configuredUsers = new Set<string>()
    for (const r of (whRows ?? []) as Wh[]) {
      configuredUsers.add(r.user_id)
      if (!whByUser.has(r.user_id)) whByUser.set(r.user_id, new Map())
      whByUser.get(r.user_id)!.set(r.day_of_week, r)
    }

    // Only keep consultants that either have MS365 connected OR have working_hours configured.
    const activeConsultants = consultantIds.filter(
      (uid) => ms365Connected.has(uid) || configuredUsers.has(uid),
    )
    if (activeConsultants.length === 0) {
      return NextResponse.json([], { headers: corsHeaders })
    }

    // 4b. Fetch calendar events (only for MS365-connected consultants) covering the window.
    const windowStartUtc = new Date(`${from}T00:00:00+09:00`)
    const windowEndUtc = new Date(`${to}T23:59:59+09:00`)
    const ms365Ids = activeConsultants.filter((uid) => ms365Connected.has(uid))
    let calEvents: {
      user_id: string
      start_at: string
      end_at: string
      is_cancelled: boolean
      show_as: string
    }[] = []
    if (ms365Ids.length > 0) {
      const { data: ce } = await db
        .from('calendar_events')
        .select('user_id, start_at, end_at, is_cancelled, show_as')
        .in('user_id', ms365Ids)
        .eq('is_cancelled', false)
        .in('show_as', ['busy', 'tentative', 'oof'])
        .lte('start_at', windowEndUtc.toISOString())
        .gte('end_at', windowStartUtc.toISOString())
      calEvents = ce ?? []
    }
    const calByUser = new Map<string, BusyInterval[]>()
    for (const uid of activeConsultants) calByUser.set(uid, [])
    for (const ev of calEvents) {
      calByUser.get(ev.user_id)?.push({
        start: new Date(ev.start_at).getTime(),
        end: new Date(ev.end_at).getTime(),
      })
    }

    // 4c. Fetch existing pending/confirmed booking_slots in the window.
    const { data: existingSlots } = await db
      .from('booking_slots')
      .select('consultant_user_id, event_date, start_time, end_time, status')
      .in('consultant_user_id', activeConsultants)
      .in('status', ['pending', 'confirmed'])
      .gte('event_date', from)
      .lte('event_date', to)
    type ExSlot = {
      consultant_user_id: string
      event_date: string
      start_time: string
      end_time: string
    }
    const slotsByUser = new Map<string, BusyInterval[]>()
    for (const uid of activeConsultants) slotsByUser.set(uid, [])
    for (const s of (existingSlots ?? []) as ExSlot[]) {
      if (!s.consultant_user_id) continue
      slotsByUser.get(s.consultant_user_id)?.push({
        start: jstDateTimeToUtc(s.event_date, s.start_time).getTime(),
        end: jstDateTimeToUtc(s.event_date, s.end_time).getTime(),
      })
    }

    // 5. Per-date, per-consultant computation.
    const dates = enumerateDates(from, to, 60)
    // Key: `${start_at}|${end_at}` → Set<user_id>
    const slotMap = new Map<string, Set<string>>()

    const nowMs = Date.now()

    for (const date of dates) {
      const dow = jstDayOfWeek(date)
      for (const uid of activeConsultants) {
        // Determine working window for this uid on this day.
        const userWh = whByUser.get(uid)
        let startTime: string | null = null
        let endTime: string | null = null
        if (userWh && userWh.has(dow)) {
          const w = userWh.get(dow)!
          startTime = w.start_time
          endTime = w.end_time
        } else if (!userWh || userWh.size === 0) {
          // No rows configured → default Mon-Fri 10:00–17:00.
          if (dow >= 1 && dow <= 5) {
            startTime = '10:00'
            endTime = '17:00'
          }
        }
        if (!startTime || !endTime) continue

        const windowStart = jstDateTimeToUtc(date, startTime).getTime()
        const windowEnd = jstDateTimeToUtc(date, endTime).getTime()
        if (windowEnd <= windowStart) continue

        // Gather busy intervals for this user clipped to [windowStart, windowEnd].
        const busyRaw = [
          ...(calByUser.get(uid) ?? []),
          ...(slotsByUser.get(uid) ?? []),
        ]
          .filter((b) => b.end > windowStart && b.start < windowEnd)
          .map((b) => ({
            start: Math.max(b.start, windowStart),
            end: Math.min(b.end, windowEnd),
          }))
        const merged = mergeIntervals(busyRaw)
        const free = subtractBusy(windowStart, windowEnd, merged)

        // Slice each free interval into chunks aligned to :00/:15/:30/:45 JST.
        for (const interval of free) {
          let cursor = ceilTo15JST(new Date(Math.max(interval.start, nowMs))).getTime()
          while (cursor + chunkLen * 60_000 <= interval.end) {
            const slotStart = cursor
            const slotEnd = cursor + bookingLen * 60_000
            const key = `${new Date(slotStart).toISOString()}|${new Date(slotEnd).toISOString()}`
            if (!slotMap.has(key)) slotMap.set(key, new Set())
            slotMap.get(key)!.add(uid)
            cursor += chunkLen * 60_000
          }
        }
      }
    }

    // 6. Flatten
    const result = Array.from(slotMap.entries())
      .map(([key, users]) => {
        const [start_at, end_at] = key.split('|')
        return {
          start_at,
          end_at,
          candidate_consultants: Array.from(users),
          duration_min: category.duration_min,
        }
      })
      .sort((a, b) => a.start_at.localeCompare(b.start_at))

    return NextResponse.json(result, { headers: corsHeaders })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[book/slots] error:', err)
    return NextResponse.json({ error: msg }, { status: 500, headers: corsHeaders })
  }
}
