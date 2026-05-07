// =============================================================================
// Data abstraction layer – Members
// =============================================================================

import type { User } from '@/types/database'
import type { InviteMemberForm } from '@/types/member'
import type { Database } from '@/lib/supabase/types'
import { isMockMode } from '@/lib/utils'

// ---------------------------------------------------------------------------
// getMembers
// ---------------------------------------------------------------------------

export async function getMembers(): Promise<User[]> {
  if (isMockMode()) {
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
  if (isMockMode()) {
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
  if (isMockMode()) {
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
  if (updates.manager_id !== undefined) payload.manager_id = updates.manager_id
  if (updates.department !== undefined) payload.department = updates.department
  if (updates.title !== undefined) payload.title = updates.title
  if (updates.level !== undefined) payload.level = updates.level

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
  if (isMockMode()) {
    const { addMockMember } = await import('@/lib/mock/handlers')
    return addMockMember({ ...data, password: 'workflow2026' })
  }

  // 本番では管理者(service-role)権限が必要なため、必ず API ルート経由で実行する。
  // ブラウザから直接 admin client を呼ぶと SUPABASE_SERVICE_ROLE_KEY が undefined になり失敗する。
  const res = await fetch('/api/members/invite', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })

  if (!res.ok) {
    const payload = await res.json().catch(() => ({}))
    throw new Error(payload.detail || payload.error || 'members.error.inviteFailed')
  }
  return (await res.json()) as User
}

// ---------------------------------------------------------------------------
// deleteMember (soft delete)
// ---------------------------------------------------------------------------

export async function deleteMember(id: string): Promise<boolean> {
  if (isMockMode()) {
    const { deleteMockMember } = await import('@/lib/mock/handlers')
    return deleteMockMember(id)
  }

  const res = await fetch(`/api/members/${id}`, { method: 'DELETE' })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || 'members.error.deleteFailed')
  }
  const result = await res.json()
  if (!result.success) {
    throw new Error('members.error.deleteNotPermitted')
  }

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
  if (isMockMode()) {
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
    return { success: false, error: 'members.error.wrongPassword' }
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
  if (isMockMode()) {
    const { forceChangeMockPassword } = await import('@/lib/mock/handlers')
    return forceChangeMockPassword(userId, newPassword)
  }

  const tag = '[forceChangePassword]'
  console.log(`${tag} START userId=${userId}`)

  // Step 1: ブラウザの自セッションで auth パスワードを更新
  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()

  const { data: pre } = await supabase.auth.getUser()
  console.log(`${tag} pre-update session uid=${pre?.user?.id ?? 'null'} email=${pre?.user?.email ?? 'null'}`)

  const { data: authData, error: authError } = await supabase.auth.updateUser({ password: newPassword })
  console.log(`${tag} auth.updateUser → uid=${authData?.user?.id ?? 'null'} err=${authError?.message ?? 'none'}`)
  if (authError) {
    return { success: false, error: authError.message }
  }

  // Step 2: must_change_password フラグのクリアは admin 権限が要るため、API ルート経由で実行する。
  // ブラウザから直接 admin client を呼ぶと SUPABASE_SERVICE_ROLE_KEY が undefined になり失敗する。
  try {
    console.log(`${tag} calling /api/auth/force-change-password for ${userId}`)
    const res = await fetch('/api/auth/force-change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
      credentials: 'include',
    })
    const payload = await res.json().catch(() => ({}))
    console.log(`${tag} api response status=${res.status} body=`, payload)

    if (!res.ok) {
      console.error(
        `${tag} CRITICAL: Password changed in auth but must_change_password flag NOT cleared for user ${userId}. Server returned:`,
        payload
      )
      return { success: false, error: payload.error || 'members.error.dbUpdateFailed' }
    }
    return { success: true }
  } catch (err) {
    console.error(`${tag} flag-clear API call failed:`, err)
    return { success: false, error: 'members.error.dbUpdateFailed' }
  }
}

// ---------------------------------------------------------------------------
// loginUser
// ---------------------------------------------------------------------------

export async function loginUser(
  email: string,
  password: string
): Promise<User | null> {
  if (isMockMode()) {
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
