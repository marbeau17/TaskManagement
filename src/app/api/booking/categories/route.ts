import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

async function verifyAuthenticated() {
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { authorized: false, user: null, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
  return { authorized: true, user, response: null }
}

// GET /api/booking/categories — list all categories for authenticated users.
export async function GET(_request: NextRequest) {
  try {
    const auth = await verifyAuthenticated()
    if (!auth.authorized) return auth.response!

    const { createAdminClient } = await import('@/lib/supabase/admin')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createAdminClient() as any

    const { data, error } = await db
      .from('booking_categories')
      .select('*')
      .order('display_order', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data ?? [])
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

// PATCH /api/booking/categories — bulk update unsupported; individual updates go to /[id].
// Kept here as a convenience 405 so callers get a clear error.
export async function PATCH() {
  return NextResponse.json(
    { error: 'Use PATCH /api/booking/categories/[id] to update a specific category' },
    { status: 405 },
  )
}
