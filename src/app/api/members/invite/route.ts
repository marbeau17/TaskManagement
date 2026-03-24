import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { UserRole } from '@/types/database'

const useMock = () => process.env.NEXT_PUBLIC_USE_MOCK === 'true'

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
      // In mock mode, return a fake new member
      const mockMember = {
        id: `user-${Date.now()}`,
        email,
        name,
        name_short: name.charAt(0),
        role,
        avatar_color: 'av-a' as const,
        weekly_capacity_hours: 16,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      return NextResponse.json(mockMember, { status: 201 })
    }

    // In production, create user via Supabase admin API
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const supabase = createAdminClient()

    // Create auth user
    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email,
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
