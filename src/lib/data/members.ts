// =============================================================================
// Data abstraction layer – Members
// =============================================================================

import type { User } from '@/types/database'

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
