// =============================================================================
// Data abstraction layer – Projects
// =============================================================================

import type { Project, ProjectFilters } from '@/types/project'
import { useMock } from '@/lib/utils'

// ---------------------------------------------------------------------------
// getProjects
// ---------------------------------------------------------------------------

export async function getProjects(filters?: ProjectFilters): Promise<Project[]> {
  if (useMock()) {
    const { getMockProjects } = await import('@/lib/mock/handlers')
    return getMockProjects(filters)
  }

  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from('projects')
    .select('*, pm:users!pm_id(*)')
    .order('created_at', { ascending: false })

  if (filters?.status && filters.status !== 'all') {
    query = query.eq('status', filters.status)
  }

  if (filters?.pm_id) {
    query = query.eq('pm_id', filters.pm_id)
  }

  if (filters?.search) {
    query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
  }

  const { data, error } = await query

  if (error) throw error
  return (data ?? []) as Project[]
}

// ---------------------------------------------------------------------------
// getProjectById
// ---------------------------------------------------------------------------

export async function getProjectById(id: string): Promise<Project | null> {
  if (useMock()) {
    const { getMockProjectById } = await import('@/lib/mock/handlers')
    return getMockProjectById(id)
  }

  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('projects')
    .select('*, pm:users!pm_id(*)')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }
  return data as Project
}

// ---------------------------------------------------------------------------
// createProject
// ---------------------------------------------------------------------------

export async function createProject(
  data: Omit<Project, 'id' | 'next_issue_seq' | 'created_at' | 'updated_at' | 'pm'>
): Promise<Project> {
  if (useMock()) {
    const { createMockProject } = await import('@/lib/mock/handlers')
    return createMockProject(data)
  }

  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: result, error } = await (supabase as any)
    .from('projects')
    .insert(data)
    .select('*, pm:users!pm_id(*)')
    .single()

  if (error) throw error
  return result as Project
}

// ---------------------------------------------------------------------------
// updateProject
// ---------------------------------------------------------------------------

export async function updateProject(
  id: string,
  data: Partial<Omit<Project, 'id' | 'created_at' | 'updated_at' | 'pm'>>
): Promise<Project> {
  if (useMock()) {
    const { updateMockProject } = await import('@/lib/mock/handlers')
    return updateMockProject(id, data)
  }

  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: result, error } = await (supabase as any)
    .from('projects')
    .update(data)
    .eq('id', id)
    .select('*, pm:users!pm_id(*)')
    .single()

  if (error) throw error
  return result as Project
}

// ---------------------------------------------------------------------------
// deleteProject
// ---------------------------------------------------------------------------

export async function deleteProject(id: string): Promise<boolean> {
  if (useMock()) {
    const { deleteMockProject } = await import('@/lib/mock/handlers')
    return deleteMockProject(id)
  }

  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('projects')
    .delete()
    .eq('id', id)

  if (error) throw error
  return true
}
