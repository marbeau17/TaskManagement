// =============================================================================
// Data abstraction layer – Project Members (legacy)
// =============================================================================

import type { ProjectMember } from '@/types/database'
import { useMock } from '@/lib/utils'

// ---------------------------------------------------------------------------
// getProjectMembers
// ---------------------------------------------------------------------------

export async function getProjectMembers(projectName?: string): Promise<ProjectMember[]> {
  if (useMock()) {
    const { getMockProjectMembers } = await import('@/lib/mock/handlers')
    return getMockProjectMembers(projectName)
  }

  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from('project_members')
    .select('*, pm:users!pm_id(*), member:users!member_id(*)')
    .order('created_at', { ascending: false })

  if (projectName) {
    query = query.eq('project_name', projectName)
  }

  const { data, error } = await query

  if (error) throw error
  return (data ?? []) as ProjectMember[]
}

// ---------------------------------------------------------------------------
// addProjectMember
// ---------------------------------------------------------------------------

export async function addProjectMember(
  projectName: string,
  pmId: string,
  memberId: string,
  allocatedHours: number
): Promise<ProjectMember> {
  if (useMock()) {
    const { addMockProjectMember } = await import('@/lib/mock/handlers')
    return addMockProjectMember(projectName, pmId, memberId, allocatedHours)
  }

  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('project_members')
    .insert({
      project_name: projectName,
      pm_id: pmId,
      member_id: memberId,
      allocated_hours: allocatedHours,
    })
    .select('*, pm:users!pm_id(*), member:users!member_id(*)')
    .single()

  if (error) throw error
  return data as ProjectMember
}

// ---------------------------------------------------------------------------
// removeProjectMember
// ---------------------------------------------------------------------------

export async function removeProjectMember(id: string): Promise<boolean> {
  if (useMock()) {
    const { removeMockProjectMember } = await import('@/lib/mock/handlers')
    return removeMockProjectMember(id)
  }

  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('project_members')
    .delete()
    .eq('id', id)

  if (error) throw error
  return true
}

// ---------------------------------------------------------------------------
// updateProjectMemberHours
// ---------------------------------------------------------------------------

export async function updateProjectMemberHours(id: string, hours: number): Promise<ProjectMember> {
  if (useMock()) {
    const { updateMockProjectMemberHours } = await import('@/lib/mock/handlers')
    return updateMockProjectMemberHours(id, hours)
  }

  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('project_members')
    .update({ allocated_hours: hours })
    .eq('id', id)
    .select('*, pm:users!pm_id(*), member:users!member_id(*)')
    .single()

  if (error) throw error
  return data as ProjectMember
}
