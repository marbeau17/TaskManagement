// =============================================================================
// Data abstraction layer – Members
// =============================================================================

import type { User } from '@/types/database'
import type { InviteMemberForm } from '@/types/member'

const useMock = () => process.env.NEXT_PUBLIC_USE_MOCK === 'true'

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

  const { data, error } = await supabase
    .from('users')
    .update(updates)
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

  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()

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

  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()

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

  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()

  const { error: authError } = await supabase.auth.updateUser({ password: newPassword })
  if (authError) {
    return { success: false, error: authError.message }
  }

  const { error: dbError } = await supabase
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
