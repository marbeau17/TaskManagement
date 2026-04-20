import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

// WEB-15: Helper to verify caller is admin or director
async function verifyAdminOrDirector() {
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { authorized: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()
  if (!profile || (profile.role !== 'admin' && profile.role !== 'director')) {
    return { authorized: false, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  return { authorized: true, response: null }
}

// WEB-42: Helper that allows self-updates (by any authenticated user) OR admin/director updates on others.
async function verifyCanUpdateMember(targetId: string) {
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return {
      authorized: false,
      isSelf: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }
  if (user.id === targetId) {
    return { authorized: true, isSelf: true, response: null }
  }
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()
  if (!profile || (profile.role !== 'admin' && profile.role !== 'director')) {
    return {
      authorized: false,
      isSelf: false,
      response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    }
  }
  return { authorized: true, isSelf: false, response: null }
}

// Fields a user is allowed to change on their own profile. Role/active/admin fields stay admin-only.
const SELF_EDITABLE_FIELDS = new Set([
  'name',
  'name_short',
  'avatar_color',
  'avatar_url',
  'email',
  'phone',
  'title',
  'department',
  'bio',
])

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // WEB-42: self-update allowed; elevated changes still require admin/director.
    const auth = await verifyCanUpdateMember(id)
    if (!auth.authorized) return auth.response!

    const body = await request.json()
    const payload = auth.isSelf
      ? Object.fromEntries(
          Object.entries(body).filter(([key]) => SELF_EDITABLE_FIELDS.has(key)),
        )
      : body

    const { createAdminClient } = await import('@/lib/supabase/admin')
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('users')
      .update(payload)
      .eq('id', id)
      .select()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, data })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // WEB-15: Role check
    const auth = await verifyAdminOrDirector()
    if (!auth.authorized) return auth.response!

    const { id } = await params

    const { createAdminClient } = await import('@/lib/supabase/admin')
    const supabase = createAdminClient()

    // Soft delete: set is_active to false
    const { data, error } = await supabase
      .from('users')
      .update({ is_active: false })
      .eq('id', id)
      .select()

    if (error) {
      return NextResponse.json({ error: error.message, success: false }, { status: 500 })
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'No rows updated', success: false }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: String(error), success: false },
      { status: 500 }
    )
  }
}
