import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

async function verifyAuthenticated() {
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { authorized: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
  return { authorized: true, response: null }
}

// GET /api/booking/consultants — list all users assigned to at least one public category.
// Used by admin UI for a cross-category overview. Includes ms365_connected flag.
export async function GET(_request: NextRequest) {
  try {
    const auth = await verifyAuthenticated()
    if (!auth.authorized) return auth.response!

    const { createAdminClient } = await import('@/lib/supabase/admin')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createAdminClient() as any

    // Find public category ids.
    const { data: cats, error: catsErr } = await db
      .from('booking_categories')
      .select('id')
      .eq('is_public', true)

    if (catsErr) return NextResponse.json({ error: catsErr.message }, { status: 500 })

    const publicCategoryIds: string[] = (cats ?? []).map((c: { id: string }) => c.id)
    if (publicCategoryIds.length === 0) return NextResponse.json([])

    // Distinct user_ids assigned to those categories.
    const { data: joinRows, error: joinErr } = await db
      .from('booking_category_consultants')
      .select('user_id, category_id')
      .in('category_id', publicCategoryIds)

    if (joinErr) return NextResponse.json({ error: joinErr.message }, { status: 500 })

    const userIds = Array.from(
      new Set((joinRows ?? []).map((r: { user_id: string }) => r.user_id)),
    ) as string[]

    if (userIds.length === 0) return NextResponse.json([])

    const { data: users, error: usersErr } = await db
      .from('users')
      .select('id, name, name_short, avatar_color, avatar_url, email, role')
      .in('id', userIds)

    if (usersErr) return NextResponse.json({ error: usersErr.message }, { status: 500 })

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
