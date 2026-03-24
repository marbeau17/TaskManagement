import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { UserRole } from '@/types/database'
import { useMock } from '@/lib/utils'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, name, role } = body as {
      email: string
      name: string
      role: UserRole
    }

    if (!email || !name || !role) {
      return NextResponse.json(
        { error: 'email, name, and role are required' },
        { status: 400 }
      )
    }

    if (useMock()) {
      // In mock mode, use addMockMember handler with default password
      const { addMockMember } = await import('@/lib/mock/handlers')
      const mockMember = addMockMember({
        email,
        name,
        name_short: name.charAt(0),
        role,
        weekly_capacity_hours: 16,
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
        name_short: name.charAt(0),
        role,
        weekly_capacity_hours: 16,
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
