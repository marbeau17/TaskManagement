import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { isMockMode } from '@/lib/utils'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    // WEB-15: Only admin/director can invite members
    if (!isMockMode()) {
      const supabase = await createServerSupabaseClient()
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()
      if (!profile || (profile.role !== 'admin' && profile.role !== 'director')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    const body = await request.json()
    const {
      email,
      name,
      role,
      name_short,
      weekly_capacity_hours,
    } = body as {
      email: string
      name: string
      role: string
      name_short?: string
      weekly_capacity_hours?: number
    }

    if (!email || !name || !role) {
      return NextResponse.json(
        { error: 'email, name, and role are required' },
        { status: 400 }
      )
    }

    // 略称はフォームの値を優先。未指定時は名前先頭1文字をフォールバック。
    const finalNameShort = (name_short && name_short.trim()) || name.charAt(0)
    // 週キャパは指定があれば採用、未指定時は標準の40h。
    const finalCapacity =
      typeof weekly_capacity_hours === 'number' && !Number.isNaN(weekly_capacity_hours)
        ? weekly_capacity_hours
        : 40

    if (isMockMode()) {
      // In mock mode, use addMockMember handler with default password
      const { addMockMember } = await import('@/lib/mock/handlers')
      const mockMember = addMockMember({
        email,
        name,
        name_short: finalNameShort,
        role,
        weekly_capacity_hours: finalCapacity,
        password: 'workflow2026',
      })
      return NextResponse.json(mockMember, { status: 201 })
    }

    // In production, create user via Supabase admin API
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const supabase = createAdminClient()

    // Create auth user
    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email,
        password: 'workflow2026',
        email_confirm: true,
        user_metadata: { name, role },
      })

    if (authError) throw authError

    // Insert into users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email,
        name,
        name_short: finalNameShort,
        role,
        weekly_capacity_hours: finalCapacity,
        must_change_password: true,
      })
      .select()
      .single()

    if (userError) throw userError

    return NextResponse.json(userData, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to invite member', detail: String(error) },
      { status: 500 }
    )
  }
}
