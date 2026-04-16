import { NextRequest, NextResponse } from 'next/server'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders })
}

// GET: List available slots for a date
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date') // YYYY-MM-DD
    const { createAdminClient } = await import('@/lib/supabase/admin')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createAdminClient() as any

    let query = db.from('booking_slots').select('*').order('slot_number', { ascending: true })
    if (date) query = query.eq('event_date', date)

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders })
    return NextResponse.json(data ?? [], { headers: corsHeaders })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500, headers: corsHeaders })
  }
}

// POST: Book a slot (public, no auth)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { slot_id, name, email, company } = body

    if (!slot_id || !name || !email) {
      return NextResponse.json({ error: '名前、メールアドレスは必須です' }, { status: 400, headers: corsHeaders })
    }

    const { createAdminClient } = await import('@/lib/supabase/admin')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createAdminClient() as any

    // Check if slot is still available
    const { data: slot } = await db.from('booking_slots').select('*').eq('id', slot_id).single()
    if (!slot) {
      return NextResponse.json({ error: '指定された枠が見つかりません' }, { status: 404, headers: corsHeaders })
    }
    if (!slot.is_available || slot.booked_by_email) {
      return NextResponse.json({ error: 'この枠はすでに予約済みです' }, { status: 409, headers: corsHeaders })
    }

    // Book the slot
    const { error } = await db.from('booking_slots').update({
      is_available: false,
      booked_by_name: name,
      booked_by_email: email,
      booked_by_company: company || null,
      booked_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', slot_id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders })

    return NextResponse.json({
      success: true,
      slot: { ...slot, booked_by_name: name, booked_by_email: email },
    }, { headers: corsHeaders })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500, headers: corsHeaders })
  }
}

// PUT: Admin — create/manage slots (authenticated)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, slots, slot_id } = body

    const { createAdminClient } = await import('@/lib/supabase/admin')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createAdminClient() as any

    if (action === 'seed' && Array.isArray(slots)) {
      // Bulk create slots
      const { error } = await db.from('booking_slots').upsert(slots, { onConflict: 'event_date,slot_number' })
      if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders })
      return NextResponse.json({ success: true, count: slots.length }, { headers: corsHeaders })
    }

    if (action === 'cancel' && slot_id) {
      // Cancel a booking (admin)
      const { error } = await db.from('booking_slots').update({
        is_available: true,
        booked_by_name: null,
        booked_by_email: null,
        booked_by_company: null,
        booked_at: null,
        updated_at: new Date().toISOString(),
      }).eq('id', slot_id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders })
      return NextResponse.json({ success: true }, { headers: corsHeaders })
    }

    if (action === 'toggle' && slot_id) {
      // Toggle availability
      const { data: current } = await db.from('booking_slots').select('is_available').eq('id', slot_id).single()
      if (current) {
        await db.from('booking_slots').update({
          is_available: !current.is_available,
          updated_at: new Date().toISOString(),
        }).eq('id', slot_id)
      }
      return NextResponse.json({ success: true }, { headers: corsHeaders })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400, headers: corsHeaders })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500, headers: corsHeaders })
  }
}
