// =============================================================================
// Data abstraction layer – Members
// =============================================================================

import type { User } from '@/types/database'
import type { InviteMemberForm } from '@/types/member'
import type { Database } from '@/lib/supabase/types'
import { useMock } from '@/lib/utils'

// ---------------------------------------------------------------------------
// getMembers
// ---------------------------------------------------------------------------

export async function getMembers(): Promise<User[]> {
  if (useMock()) {
    const { getMockMembers } = await import('@/lib/mock/handlers')
    return getMockMembers()
  }

  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('is_active', true)
    .order('name', { ascending: true })

  if (error) throw error
  return (data ?? []) as User[]
}

// ---------------------------------------------------------------------------
// getMemberById
// ---------------------------------------------------------------------------

export async function getMemberById(id: string): Promise<User | null> {
  if (useMock()) {
    const { getMockMemberById } = await import('@/lib/mock/handlers')
    return getMockMemberById(id)
  }

  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }
  return data as User
}

// ---------------------------------------------------------------------------
// updateMember
// ---------------------------------------------------------------------------

export async function updateMember(
  id: string,
  updates: Partial<User>
): Promise<User> {
  if (useMock()) {
    const { updateMockMember } = await import('@/lib/mock/handlers')
    return updateMockMember(id, updates)
  }

  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()

  // Build a clean update payload with only defined fields
  const payload: Record<string, unknown> = {}
  if (updates.name !== undefined) payload.name = updates.name
  if (updates.name_short !== undefined) payload.name_short = updates.name_short
  if (updates.email !== undefined) payload.email = updates.email
  if (updates.role !== undefined) payload.role = updates.role
  if (updates.avatar_color !== undefined) payload.avatar_color = updates.avatar_color
  if (updates.weekly_capacity_hours !== undefined) payload.weekly_capacity_hours = updates.weekly_capacity_hours
  if (updates.is_active !== undefined) payload.is_active = updates.is_active
  if (updates.must_change_password !== undefined) payload.must_change_password = updates.must_change_password

  const { data, error } = await supabase
    .from('users')
    .update(payload as Database['public']['Tables']['users']['Update'])
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as User
}

// ---------------------------------------------------------------------------
// addMember
// ---------------------------------------------------------------------------

export async function addMember(data: InviteMemberForm): Promise<User> {
  if (useMock()) {
    const { addMockMember } = await import('@/lib/mock/handlers')
    return addMockMember({ ...data, password: 'workflow2026' })
  }

  // Use admin client (service-role) because auth.admin.createUser requires it.
  // This function must only be called server-side (e.g. from an API route).
  const { createAdminClient } = await import('@/lib/supabase/admin')
  const supabase = createAdminClient()

  // Create auth user with default password
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: data.email,
    password: 'workflow2026',
    email_confirm: true,
    user_metadata: { name: data.name, role: data.role },
  })

  if (authError) throw authError

  // Insert into users table
  const { data: userData, error: userError } = await supabase
    .from('users')
    .insert({
      id: authData.user.id,
      email: data.email,
      name: data.name,
      name_short: data.name_short,
      role: data.role,
      weekly_capacity_hours: data.weekly_capacity_hours,
      must_change_password: true,
    })
    .select()
    .single()

  if (userError) throw userError
  return userData as User
}

// ---------------------------------------------------------------------------
// deleteMember (soft delete)
// ---------------------------------------------------------------------------

export async function deleteMember(id: string): Promise<boolean> {
  if (useMock()) {
    const { deleteMockMember } = await import('@/lib/mock/handlers')
    return deleteMockMember(id)
  }

  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()

  const { error } = await supabase
    .from('users')
    .update({ is_active: false })
    .eq('id', id)

  if (error) throw error
  return true
}

// ---------------------------------------------------------------------------
// changePassword
// ---------------------------------------------------------------------------

export async function changePassword(
  userId: string,
  oldPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  if (useMock()) {
    const { changeMockPassword } = await import('@/lib/mock/handlers')
    return changeMockPassword(userId, oldPassword, newPassword)
  }

  // Called from client-side. Use browser client.
  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()

  // Verify the user is authenticated
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) {
    return { success: false, error: 'Not authenticated' }
  }

  // Verify old password by re-authenticating
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: authUser.email!,
    password: oldPassword,
  })

  if (signInError) {
    return { success: false, error: '現在のパスワードが正しくありません' }
  }

  // Update password
  const { error } = await supabase.auth.updateUser({ password: newPassword })

  if (error) {
    return { success: false, error: error.message }
  }
  return { success: true }
}

// ---------------------------------------------------------------------------
// forceChangePassword (initial password change, no old password required)
// ---------------------------------------------------------------------------

export async function forceChangePassword(
  userId: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  if (useMock()) {
    const { forceChangeMockPassword } = await import('@/lib/mock/handlers')
    return forceChangeMockPassword(userId, newPassword)
  }

  // Use browser client to update the current user's password via their session
  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()

  const { error: authError } = await supabase.auth.updateUser({ password: newPassword })
  if (authError) {
    return { success: false, error: authError.message }
  }

  // Update the must_change_password flag in users table.
  // Use admin client to ensure RLS doesn't block the update.
  const { createAdminClient } = await import('@/lib/supabase/admin')
  const adminSupabase = createAdminClient()

  const { error: dbError } = await adminSupabase
    .from('users')
    .update({ must_change_password: false })
    .eq('id', userId)

  if (dbError) {
    return { success: false, error: dbError.message }
  }

  return { success: true }
}

// ---------------------------------------------------------------------------
// loginUser
// ---------------------------------------------------------------------------

export async function loginUser(
  email: string,
  password: string
): Promise<User | null> {
  if (useMock()) {
    const { verifyMockPassword } = await import('@/lib/mock/handlers')
    return verifyMockPassword(email, password)
  }

  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error || !data.user) return null

  // Fetch user profile from users table
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('id', data.user.id)
    .single()

  if (userError) return null
  return userData as User
}
