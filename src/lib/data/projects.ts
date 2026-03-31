// =============================================================================
// Data abstraction layer – Projects
// =============================================================================

import type { Project, ProjectFilters } from '@/types/project'
import { isMockMode } from '@/lib/utils'

// ---------------------------------------------------------------------------
// getProjects
// ---------------------------------------------------------------------------

export async function getProjects(filters?: ProjectFilters): Promise<Project[]> {
  if (isMockMode()) {
    const { getMockProjects } = await import('@/lib/mock/handlers')
    return getMockProjects(filters)
  }

  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from('projects')
    .select('*, pm:users!projects_pm_id_fkey(*)')
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
  if (isMockMode()) {
    const { getMockProjectById } = await import('@/lib/mock/handlers')
    return getMockProjectById(id)
  }

  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('projects')
    .select('*, pm:users!projects_pm_id_fkey(*)')
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
  if (isMockMode()) {
    const { createMockProject } = await import('@/lib/mock/handlers')
    return createMockProject(data)
  }

  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: result, error } = await (supabase as any)
    .from('projects')
    .insert(data)
    .select('*, pm:users!projects_pm_id_fkey(*)')
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
  if (isMockMode()) {
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
    .select('*, pm:users!projects_pm_id_fkey(*)')
    .single()

  if (error) throw error
  return result as Project
}

// ---------------------------------------------------------------------------
// deleteProject
// ---------------------------------------------------------------------------

export async function deleteProject(id: string): Promise<boolean> {
  if (isMockMode()) {
    const { deleteMockProject } = await import('@/lib/mock/handlers')
    return deleteMockProject(id)
  }

  const res = await fetch('/api/projects/delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectId: id }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || 'Delete failed')
  }
  return true
}
