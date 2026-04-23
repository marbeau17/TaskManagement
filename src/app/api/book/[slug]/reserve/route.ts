import { NextRequest, NextResponse } from 'next/server'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders })
}

// ---------------------------------------------------------------------------
// In-memory rate limiter: 5 reservations/IP/hour. Best-effort only; resets on
// cold start. Acceptable for MVP.
// ---------------------------------------------------------------------------
const RATE_WINDOW_MS = 60 * 60 * 1000
const RATE_LIMIT = 5
const rateBuckets: Map<string, number[]> = (globalThis as unknown as { __bookRate?: Map<string, number[]> }).__bookRate
  ?? new Map<string, number[]>()
;(globalThis as unknown as { __bookRate?: Map<string, number[]> }).__bookRate = rateBuckets

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const list = (rateBuckets.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS)
  if (list.length >= RATE_LIMIT) {
    rateBuckets.set(ip, list)
    return false
  }
  list.push(now)
  rateBuckets.set(ip, list)
  return true
}

function clientIp(req: NextRequest): string {
  const xff = req.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  const real = req.headers.get('x-real-ip')
  if (real) return real
  return 'unknown'
}

// Mirrors the validation used in src/app/api/form/submit — simple RFC-ish check.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const JST_OFFSET_MIN = 9 * 60
function toJstDateParts(iso: string): { date: string; time: string } {
  const d = new Date(iso)
  const jst = new Date(d.getTime() + JST_OFFSET_MIN * 60_000)
  const y = jst.getUTCFullYear()
  const m = String(jst.getUTCMonth() + 1).padStart(2, '0')
  const day = String(jst.getUTCDate()).padStart(2, '0')
  const hh = String(jst.getUTCHours()).padStart(2, '0')
  const mm = String(jst.getUTCMinutes()).padStart(2, '0')
  return { date: `${y}-${m}-${day}`, time: `${hh}:${mm}` }
}

interface BusyInterval {
  start: number
  end: number
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> | { slug: string } },
) {
  try {
    const params = await Promise.resolve(context.params)
    const slug = params.slug
    const body = await request.json().catch(() => ({}))

    // ------------------------------------------------------------------
    // Honeypot — silently accept and drop.
    // ------------------------------------------------------------------
    if (body.honeypot && String(body.honeypot).trim().length > 0) {
      return NextResponse.json({ success: true }, { headers: corsHeaders })
    }

    const ip = clientIp(request)
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'rate_limited' },
        { status: 429, headers: corsHeaders },
      )
    }

    const { slot_start_at, slot_end_at, name, email, company, phone, message } = body as {
      slot_start_at?: string
      slot_end_at?: string
      name?: string
      email?: string
      company?: string
      phone?: string
      message?: string
    }

    if (!slot_start_at || !slot_end_at || !name || !email) {
      return NextResponse.json(
        { error: 'missing_fields' },
        { status: 400, headers: corsHeaders },
      )
    }
    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ error: 'invalid_email' }, { status: 400, headers: corsHeaders })
    }
    const slotStart = new Date(slot_start_at)
    const slotEnd = new Date(slot_end_at)
    if (isNaN(slotStart.getTime()) || isNaN(slotEnd.getTime()) || slotEnd <= slotStart) {
      return NextResponse.json({ error: 'invalid_slot' }, { status: 400, headers: corsHeaders })
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

    // 2. Consultants for this category
    const { data: consultantRows } = await db
      .from('booking_category_consultants')
      .select('user_id')
      .eq('category_id', category.id)
    const consultantIds: string[] = (consultantRows ?? []).map((r: { user_id: string }) => r.user_id)
    if (consultantIds.length === 0) {
      return NextResponse.json({ error: 'no_consultants' }, { status: 409, headers: corsHeaders })
    }

    // 3. Filter to active consultants (MS365 connected OR working_hours configured)
    const { data: msRows } = await db
      .from('ms365_tokens')
      .select('user_id')
      .in('user_id', consultantIds)
    const ms365Connected = new Set<string>((msRows ?? []).map((r: { user_id: string }) => r.user_id))

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

    const activeConsultants = consultantIds.filter(
      (uid) => ms365Connected.has(uid) || configuredUsers.has(uid),
    )
    if (activeConsultants.length === 0) {
      return NextResponse.json({ error: 'slot_unavailable' }, { status: 409, headers: corsHeaders })
    }

    // Working window check: determine JST date + day of week from slot_start_at.
    const { date: slotDate } = toJstDateParts(slotStart.toISOString())
    const dowDate = new Date(`${slotDate}T00:00:00+09:00`)
    const [y, m, d] = slotDate.split('-').map(Number)
    const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay()
    void dowDate // silence

    // 4. Busy lookup per active consultant (calendar + existing slots) overlapping the requested window.
    let calEvents: {
      user_id: string
      start_at: string
      end_at: string
      is_cancelled: boolean
      show_as: string
    }[] = []
    const ms365Ids = activeConsultants.filter((uid) => ms365Connected.has(uid))
    if (ms365Ids.length > 0) {
      const { data: ce } = await db
        .from('calendar_events')
        .select('user_id, start_at, end_at, is_cancelled, show_as')
        .in('user_id', ms365Ids)
        .eq('is_cancelled', false)
        .in('show_as', ['busy', 'tentative', 'oof'])
        .lt('start_at', slotEnd.toISOString())
        .gt('end_at', slotStart.toISOString())
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

    const { data: existingSlots } = await db
      .from('booking_slots')
      .select('consultant_user_id, event_date, start_time, end_time, status')
      .in('consultant_user_id', activeConsultants)
      .in('status', ['pending', 'confirmed'])
      .eq('event_date', slotDate)
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
      const bs = new Date(`${s.event_date}T${s.start_time.length === 5 ? s.start_time + ':00' : s.start_time}+09:00`).getTime()
      const be = new Date(`${s.event_date}T${s.end_time.length === 5 ? s.end_time + ':00' : s.end_time}+09:00`).getTime()
      slotsByUser.get(s.consultant_user_id)?.push({ start: bs, end: be })
    }

    // 5. Filter consultants free in the requested window AND within working hours.
    const requestedStartMs = slotStart.getTime()
    const requestedEndMs = slotEnd.getTime()
    const freeConsultants: string[] = []
    for (const uid of activeConsultants) {
      // Working window for this day.
      const userWh = whByUser.get(uid)
      let startTime: string | null = null
      let endTime: string | null = null
      if (userWh && userWh.has(dow)) {
        const w = userWh.get(dow)!
        startTime = w.start_time
        endTime = w.end_time
      } else if (!userWh || userWh.size === 0) {
        if (dow >= 1 && dow <= 5) {
          startTime = '10:00'
          endTime = '17:00'
        }
      }
      if (!startTime || !endTime) continue
      const winStart = new Date(`${slotDate}T${startTime.length === 5 ? startTime + ':00' : startTime}+09:00`).getTime()
      const winEnd = new Date(`${slotDate}T${endTime.length === 5 ? endTime + ':00' : endTime}+09:00`).getTime()
      if (requestedStartMs < winStart || requestedEndMs > winEnd) continue

      // Conflict check.
      const busy = [
        ...(calByUser.get(uid) ?? []),
        ...(slotsByUser.get(uid) ?? []),
      ]
      const conflict = busy.some((b) => b.start < requestedEndMs && b.end > requestedStartMs)
      if (!conflict) freeConsultants.push(uid)
    }

    if (freeConsultants.length === 0) {
      return NextResponse.json(
        { error: 'slot_unavailable' },
        { status: 409, headers: corsHeaders },
      )
    }

    // 6. Round-robin: pick consultant with fewest pending/confirmed bookings in last 7 days.
    const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000).toISOString()
    const { data: recent } = await db
      .from('booking_slots')
      .select('consultant_user_id, booked_at')
      .in('consultant_user_id', freeConsultants)
      .in('status', ['pending', 'confirmed'])
      .gte('booked_at', sevenDaysAgo)
    const counts = new Map<string, number>()
    for (const uid of freeConsultants) counts.set(uid, 0)
    for (const r of (recent ?? []) as { consultant_user_id: string }[]) {
      counts.set(r.consultant_user_id, (counts.get(r.consultant_user_id) ?? 0) + 1)
    }
    const chosenConsultant = freeConsultants.slice().sort((a, b) => {
      const diff = (counts.get(a) ?? 0) - (counts.get(b) ?? 0)
      if (diff !== 0) return diff
      return a.localeCompare(b)
    })[0]

    // ------------------------------------------------------------------
    // 7. CRM writes (no real Postgres transaction from supabase-js, but we
    // order writes so partial failures leave a best-effort audit trail).
    // ------------------------------------------------------------------

    // 7a. Company
    let companyId: string | null = null
    if (company && company.trim()) {
      const { data: existingCo } = await db
        .from('crm_companies')
        .select('id')
        .eq('name', company)
        .maybeSingle()
      if (existingCo) {
        companyId = existingCo.id
      } else {
        const { data: newCo } = await db
          .from('crm_companies')
          .insert({ name: company, source: `booking:${slug}` })
          .select('id')
          .single()
        companyId = newCo?.id ?? null
      }
    }

    // 7b. Contact (split name)
    const nameParts = name.trim().split(/\s+/)
    const first_name = nameParts.length > 1 ? nameParts[0] : ''
    const last_name = nameParts.length > 1 ? nameParts.slice(1).join(' ') : name.trim()
    let contactId: string | null = null
    const { data: existingContact } = await db
      .from('crm_contacts')
      .select('id')
      .eq('email', email)
      .maybeSingle()
    if (existingContact) {
      contactId = existingContact.id
      await db.from('crm_contacts').update({
        company_id: companyId ?? undefined,
        phone: phone || undefined,
        first_name: first_name || undefined,
        last_name: last_name || undefined,
        source: `booking:${slug}`,
        source_channel: 'booking',
        updated_at: new Date().toISOString(),
      }).eq('id', contactId)
    } else {
      const { data: newContact } = await db.from('crm_contacts').insert({
        first_name,
        last_name,
        email,
        phone: phone || '',
        company_id: companyId,
        lifecycle_stage: 'lead',
        lead_status: 'new',
        source: `booking:${slug}`,
        source_channel: 'booking',
      }).select('id').single()
      contactId = newContact?.id ?? null
    }

    // 7c. Lead
    const displayName = [first_name, last_name].filter(Boolean).join(' ').trim() || name
    const leadDescription = [
      `【カテゴリ】${category.title}`,
      `【予約日時】${slotStart.toISOString()} – ${slotEnd.toISOString()}`,
      company ? `【会社】${company}` : '',
      phone ? `【電話】${phone}` : '',
      message ? `【相談内容】\n${message}` : '',
    ].filter(Boolean).join('\n')
    const { data: lead } = await db.from('crm_leads').insert({
      title: `${category.title} - ${displayName}`,
      contact_id: contactId,
      company_id: companyId,
      status: 'new',
      source: `booking:${slug}`,
      description: leadDescription,
      owner_id: chosenConsultant,
    }).select('id').single()

    // 7d. Activity
    if (contactId) {
      await db.from('crm_activities').insert({
        entity_type: 'contact',
        entity_id: contactId,
        activity_type: 'meeting',
        subject: `予約: ${category.title}`,
        body: message || '',
        scheduled_at: slotStart.toISOString(),
        duration_minutes: category.duration_min,
        user_id: chosenConsultant,
        metadata: { booking_slug: slug, lead_id: lead?.id ?? null },
      })
    }

    // 7e. booking_slots insert
    const { date: eventDate, time: startTime } = toJstDateParts(slotStart.toISOString())
    const { time: endTime } = toJstDateParts(slotEnd.toISOString())
    // slot_number: timestamp-ish to avoid collision on same date (unique index is (event_date, slot_number)).
    const slotNumberBase = Math.floor(slotStart.getTime() / 1000) % 2_000_000_000

    let inserted: {
      id: string
      cancellation_token: string
    } | null = null
    let attempt = 0
    let lastErr: unknown = null
    while (attempt < 5 && !inserted) {
      const slot_number = slotNumberBase + attempt
      const { data: ins, error: insErr } = await db.from('booking_slots').insert({
        event_name: category.title,
        event_date: eventDate,
        start_time: startTime,
        end_time: endTime,
        slot_number,
        is_available: false,
        status: 'confirmed',
        category_id: category.id,
        consultant_user_id: chosenConsultant,
        contact_id: contactId,
        booked_by_name: name,
        booked_by_email: email,
        booked_by_company: company || null,
        booked_by_phone: phone || null,
        booked_by_message: message || null,
        booked_at: new Date().toISOString(),
        confirmed_at: new Date().toISOString(),
      }).select('id, cancellation_token').single()
      if (ins && !insErr) {
        inserted = ins
        break
      }
      lastErr = insErr
      attempt++
    }

    if (!inserted) {
      console.error('[book/reserve] booking_slots insert failed:', lastErr)
      return NextResponse.json(
        { error: 'booking_failed' },
        { status: 500, headers: corsHeaders },
      )
    }

    // Consultant details for response + admin email
    const { data: consultantUser } = await db
      .from('users')
      .select('id, name, email')
      .eq('id', chosenConsultant)
      .maybeSingle()

    // ------------------------------------------------------------------
    // 8. Fire-and-forget emails. Do not block or fail the reservation.
    // ------------------------------------------------------------------
    const response = NextResponse.json(
      {
        booking_id: inserted.id,
        cancellation_token: inserted.cancellation_token,
        consultant: {
          name: consultantUser?.name ?? '',
          email: consultantUser?.email ?? '',
        },
        category: {
          title: category.title,
          duration_min: category.duration_min,
        },
        slot_start_at: slotStart.toISOString(),
        slot_end_at: slotEnd.toISOString(),
      },
      { headers: corsHeaders },
    )

    ;(async () => {
      try {
        const mod = await import('@/lib/email/booking').catch(() => null)
        if (!mod) return
        const bookingPayload = {
          id: inserted!.id,
          cancellation_token: inserted!.cancellation_token,
          slot_start_at: slotStart.toISOString(),
          slot_end_at: slotEnd.toISOString(),
          name,
          email,
          company: company || null,
          phone: phone || null,
          message: message || null,
          category,
        }
        const leadPayload = lead
          ? { id: lead.id, title: `${category.title} - ${displayName}` }
          : null
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const m = mod as any
        if (typeof m.sendBookingConfirmation === 'function') {
          await m.sendBookingConfirmation({
            to: email,
            lead: leadPayload,
            booking: bookingPayload,
          })
        }
        if (typeof m.sendBookingAdminNotification === 'function') {
          await m.sendBookingAdminNotification({
            booking: bookingPayload,
            consultant: consultantUser ?? null,
          })
        }
      } catch (emailErr) {
        console.error('[book/reserve] email failed:', emailErr)
      }
    })()

    return response
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[book/reserve] error:', err)
    return NextResponse.json({ error: msg }, { status: 500, headers: corsHeaders })
  }
}
