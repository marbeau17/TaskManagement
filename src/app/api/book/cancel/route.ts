import { NextRequest, NextResponse } from 'next/server'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders })
}

// GET /api/book/cancel?token=X — return booking details for the cancel page.
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')
    if (!token) {
      return NextResponse.json({ error: 'missing_token' }, { status: 400, headers: corsHeaders })
    }

    const { createAdminClient } = await import('@/lib/supabase/admin')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createAdminClient() as any

    const { data: slot } = await db
      .from('booking_slots')
      .select(
        'id, event_name, event_date, start_time, end_time, status, booked_by_name, booked_by_email, booked_by_company, booked_by_phone, booked_by_message, category_id, consultant_user_id, cancelled_at, cancelled_reason, confirmed_at, cancellation_token',
      )
      .eq('cancellation_token', token)
      .maybeSingle()

    if (!slot) {
      return NextResponse.json({ error: 'not_found' }, { status: 404, headers: corsHeaders })
    }

    // Enrich with category + consultant info (best-effort).
    let category = null
    if (slot.category_id) {
      const { data: cat } = await db
        .from('booking_categories')
        .select('id, slug, title, duration_min')
        .eq('id', slot.category_id)
        .maybeSingle()
      category = cat ?? null
    }
    let consultant = null
    if (slot.consultant_user_id) {
      const { data: user } = await db
        .from('users')
        .select('id, name, email')
        .eq('id', slot.consultant_user_id)
        .maybeSingle()
      consultant = user ?? null
    }

    return NextResponse.json({ booking: slot, category, consultant }, { headers: corsHeaders })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[book/cancel] GET error:', err)
    return NextResponse.json({ error: msg }, { status: 500, headers: corsHeaders })
  }
}

// POST /api/book/cancel — body { token, reason? }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const token = body?.token as string | undefined
    const reason = (body?.reason as string | undefined) ?? null
    if (!token) {
      return NextResponse.json({ error: 'missing_token' }, { status: 400, headers: corsHeaders })
    }

    const { createAdminClient } = await import('@/lib/supabase/admin')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createAdminClient() as any

    // Load current state.
    const { data: slot } = await db
      .from('booking_slots')
      .select(
        'id, event_name, event_date, start_time, end_time, status, booked_by_name, booked_by_email, category_id, consultant_user_id',
      )
      .eq('cancellation_token', token)
      .maybeSingle()
    if (!slot) {
      return NextResponse.json({ error: 'not_found' }, { status: 404, headers: corsHeaders })
    }
    if (slot.status === 'cancelled') {
      return NextResponse.json(
        { success: true, already_cancelled: true },
        { headers: corsHeaders },
      )
    }

    const nowIso = new Date().toISOString()
    const { error: updErr } = await db
      .from('booking_slots')
      .update({
        status: 'cancelled',
        is_available: true,
        cancelled_at: nowIso,
        cancelled_reason: reason,
        updated_at: nowIso,
      })
      .eq('cancellation_token', token)
    if (updErr) {
      return NextResponse.json({ error: updErr.message }, { status: 500, headers: corsHeaders })
    }

    // Best-effort: mirror onto related CRM activity (mark as cancelled).
    if (slot.consultant_user_id) {
      try {
        await db
          .from('crm_activities')
          .update({
            is_completed: true,
            outcome: 'cancelled',
            metadata: { cancelled_at: nowIso, reason },
            updated_at: nowIso,
          })
          .eq('user_id', slot.consultant_user_id)
          .eq('scheduled_at', `${slot.event_date}T${(slot.start_time.length === 5 ? slot.start_time + ':00' : slot.start_time)}+09:00`)
      } catch {
        // ignore — activity might not exist or be shaped differently
      }
    }

    // Send cancellation email (fire-and-forget).
    let consultantRow: { name?: string; email?: string } | null = null
    if (slot.consultant_user_id) {
      const { data: user } = await db
        .from('users')
        .select('name, email')
        .eq('id', slot.consultant_user_id)
        .maybeSingle()
      consultantRow = user ?? null
    }
    let categoryRow: { title?: string; duration_min?: number } | null = null
    if (slot.category_id) {
      const { data: cat } = await db
        .from('booking_categories')
        .select('title, duration_min')
        .eq('id', slot.category_id)
        .maybeSingle()
      categoryRow = cat ?? null
    }

    ;(async () => {
      try {
        const mod = await import('@/lib/email/booking').catch(() => null)
        if (!mod) return
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const m = mod as any
        if (typeof m.sendBookingCancellationEmail === 'function') {
          await m.sendBookingCancellationEmail({
            booking: {
              id: slot.id,
              event_date: slot.event_date,
              start_time: slot.start_time,
              end_time: slot.end_time,
              booked_by_name: slot.booked_by_name,
              booked_by_email: slot.booked_by_email,
              reason,
            },
            consultant: consultantRow,
            category: categoryRow,
          })
        }
      } catch (emailErr) {
        console.error('[book/cancel] email failed:', emailErr)
      }
    })()

    return NextResponse.json({ success: true }, { headers: corsHeaders })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[book/cancel] POST error:', err)
    return NextResponse.json({ error: msg }, { status: 500, headers: corsHeaders })
  }
}
