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

async function verifyAdminOrDirector() {
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { authorized: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase as any)
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()
  if (!profile || (profile.role !== 'admin' && profile.role !== 'director')) {
    return { authorized: false, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  return { authorized: true, response: null }
}

// GET /api/booking/categories/[id]/consultants — list consultants for a category.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await verifyAuthenticated()
    if (!auth.authorized) return auth.response!

    const { id } = await params

    const { createAdminClient } = await import('@/lib/supabase/admin')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createAdminClient() as any

    // Get consultant user_ids for this category.
    const { data: joinRows, error: joinErr } = await db
      .from('booking_category_consultants')
      .select('user_id')
      .eq('category_id', id)

    if (joinErr) return NextResponse.json({ error: joinErr.message }, { status: 500 })

    const userIds: string[] = (joinRows ?? []).map((r: { user_id: string }) => r.user_id)

    if (userIds.length === 0) return NextResponse.json([])

    // Fetch user rows.
    const { data: users, error: usersErr } = await db
      .from('users')
      .select('id, name, name_short, avatar_color, avatar_url, email, role')
      .in('id', userIds)

    if (usersErr) return NextResponse.json({ error: usersErr.message }, { status: 500 })

    // Fetch ms365 token presence in a single query.
    const { data: tokenRows } = await db
      .from('ms365_tokens')
      .select('user_id')
      .in('user_id', userIds)

    const connectedIds = new Set<string>(
      (tokenRows ?? []).map((r: { user_id: string }) => r.user_id),
    )

    const result = (users ?? []).map((u: {
      id: string
      name: string
      name_short: string
      avatar_color: string
      avatar_url?: string | null
      email: string
      role: string
    }) => ({
      user_id: u.id,
      name: u.name,
      name_short: u.name_short,
      avatar_color: u.avatar_color,
      avatar_url: u.avatar_url ?? null,
      email: u.email,
      role: u.role,
      ms365_connected: connectedIds.has(u.id),
    }))

    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

// PUT /api/booking/categories/[id]/consultants — replace consultants for category.
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await verifyAdminOrDirector()
    if (!auth.authorized) return auth.response!

    const { id } = await params
    const body = await request.json()
    const userIds: unknown = body?.user_ids

    if (!Array.isArray(userIds) || !userIds.every((u) => typeof u === 'string')) {
      return NextResponse.json({ error: 'user_ids must be an array of strings' }, { status: 400 })
    }

    const uniqueIds = Array.from(new Set(userIds as string[]))

    const { createAdminClient } = await import('@/lib/supabase/admin')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createAdminClient() as any

    // Delete existing rows for this category.
    const { error: delErr } = await db
      .from('booking_category_consultants')
      .delete()
      .eq('category_id', id)

    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 })

    if (uniqueIds.length === 0) {
      return NextResponse.json({ success: true, count: 0 })
    }

    const rows = uniqueIds.map((userId) => ({ category_id: id, user_id: userId }))

    const { error: insErr } = await db
      .from('booking_category_consultants')
      .insert(rows)

    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 })

    return NextResponse.json({ success: true, count: rows.length })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
