// =============================================================================
// Data abstraction layer – Milestones
// =============================================================================

import type { Milestone, CreateMilestoneData, UpdateMilestoneData } from '@/types/project'
import { useMock } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Mock storage
// ---------------------------------------------------------------------------

let mockMilestones: Milestone[] = [
  {
    id: 'ms-1',
    project_id: 'proj-1',
    title: 'デザイン完了',
    description: 'ワイヤーフレーム・デザインカンプの完了',
    due_date: '2026-04-15',
    status: 'in_progress',
    created_at: '2026-01-15T00:00:00Z',
    updated_at: '2026-01-15T00:00:00Z',
  },
  {
    id: 'ms-2',
    project_id: 'proj-1',
    title: 'コーディング完了',
    description: 'フロントエンド実装の完了',
    due_date: '2026-05-30',
    status: 'pending',
    created_at: '2026-01-15T00:00:00Z',
    updated_at: '2026-01-15T00:00:00Z',
  },
  {
    id: 'ms-3',
    project_id: 'proj-1',
    title: 'リリース',
    description: '本番環境へのデプロイ',
    due_date: '2026-06-30',
    status: 'pending',
    created_at: '2026-01-15T00:00:00Z',
    updated_at: '2026-01-15T00:00:00Z',
  },
]

// ---------------------------------------------------------------------------
// getMilestones
// ---------------------------------------------------------------------------

export async function getMilestones(projectId: string): Promise<Milestone[]> {
  if (useMock()) {
    return mockMilestones
      .filter((m) => m.project_id === projectId)
      .sort((a, b) => {
        if (!a.due_date) return 1
        if (!b.due_date) return -1
        return a.due_date.localeCompare(b.due_date)
      })
  }

  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('milestones')
    .select('*')
    .eq('project_id', projectId)
    .order('due_date', { ascending: true, nullsFirst: false })

  if (error) { console.warn("[Data]", error.message); return undefined as any }
  return (data ?? []) as Milestone[]
}

// ---------------------------------------------------------------------------
// getMilestoneById
// ---------------------------------------------------------------------------

export async function getMilestoneById(id: string): Promise<Milestone | null> {
  if (useMock()) {
    return mockMilestones.find((m) => m.id === id) ?? null
  }

  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('milestones')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }
  return data as Milestone
}

// ---------------------------------------------------------------------------
// createMilestone
// ---------------------------------------------------------------------------

export async function createMilestone(input: CreateMilestoneData): Promise<Milestone> {
  if (useMock()) {
    const now = new Date().toISOString()
    const milestone: Milestone = {
      id: `ms-${Date.now()}`,
      project_id: input.project_id,
      title: input.title,
      description: input.description ?? '',
      due_date: input.due_date ?? null,
      status: input.status ?? 'pending',
      created_at: now,
      updated_at: now,
    }
    mockMilestones.push(milestone)
    return milestone
  }

  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('milestones')
    .insert({
      project_id: input.project_id,
      title: input.title,
      description: input.description ?? '',
      due_date: input.due_date ?? null,
      status: input.status ?? 'pending',
    })
    .select('*')
    .single()

  if (error) { console.warn("[Data]", error.message); return undefined as any }
  return data as Milestone
}

// ---------------------------------------------------------------------------
// updateMilestone
// ---------------------------------------------------------------------------

export async function updateMilestone(
  id: string,
  input: UpdateMilestoneData
): Promise<Milestone> {
  if (useMock()) {
    const idx = mockMilestones.findIndex((m) => m.id === id)
    if (idx === -1) throw new Error('Milestone not found')
    mockMilestones[idx] = {
      ...mockMilestones[idx],
      ...input,
      updated_at: new Date().toISOString(),
    }
    return mockMilestones[idx]
  }

  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('milestones')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single()

  if (error) { console.warn("[Data]", error.message); return undefined as any }
  return data as Milestone
}

// ---------------------------------------------------------------------------
// deleteMilestone
// ---------------------------------------------------------------------------

export async function deleteMilestone(id: string): Promise<void> {
  if (useMock()) {
    mockMilestones = mockMilestones.filter((m) => m.id !== id)
    return
  }

  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('milestones')
    .delete()
    .eq('id', id)

  if (error) { console.warn("[Data]", error.message); return undefined as any }
}
