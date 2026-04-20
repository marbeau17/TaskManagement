// =============================================================================
// Data abstraction layer – Backlog Items
// Mock in-memory store + Supabase, following task-assignees.ts pattern
// =============================================================================

import type { BacklogItem, BacklogStatus, Task } from '@/types/database'
import { isMockMode } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Mock in-memory store
// ---------------------------------------------------------------------------

let mockItems: BacklogItem[] = []
let mockIdCounter = 1

// ---------------------------------------------------------------------------
// listBacklogItems
// ---------------------------------------------------------------------------

export async function listBacklogItems(projectId?: string): Promise<BacklogItem[]> {
  if (isMockMode()) {
    const { mockUsers } = await import('@/lib/mock/data')
    return mockItems
      .filter((i) => (projectId ? i.project_id === projectId : true))
      .map((i) => ({
        ...i,
        assignee: i.assignee_id ? mockUsers.find((u) => u.id === i.assignee_id) ?? null : null,
      }))
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
  }

  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()

  let query = supabase
    .from('backlog_items')
    .select(
      '*, assignee:users!backlog_items_assignee_id_fkey(*)'
    )
    .order('created_at', { ascending: false })

  if (projectId) query = query.eq('project_id', projectId)

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as BacklogItem[]
}

// ---------------------------------------------------------------------------
// createBacklogItem
// ---------------------------------------------------------------------------

export interface CreateBacklogInput {
  title: string
  description?: string | null
  project_id?: string | null
  priority?: number
  estimated_hours?: number | null
  assignee_id?: string | null
  status?: BacklogStatus
}

export async function createBacklogItem(input: CreateBacklogInput): Promise<BacklogItem> {
  if (isMockMode()) {
    const now = new Date().toISOString()
    const item: BacklogItem = {
      id: `mock-backlog-${mockIdCounter++}`,
      project_id: input.project_id ?? null,
      title: input.title,
      description: input.description ?? null,
      priority: input.priority ?? 3,
      estimated_hours: input.estimated_hours ?? null,
      status: input.status ?? 'new',
      assignee_id: input.assignee_id ?? null,
      promoted_task_id: null,
      created_by: null,
      created_at: now,
      updated_at: now,
    }
    mockItems.push(item)
    return item
  }

  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('backlog_items')
    .insert({
      title: input.title,
      description: input.description ?? null,
      project_id: input.project_id ?? null,
      priority: input.priority ?? 3,
      estimated_hours: input.estimated_hours ?? null,
      assignee_id: input.assignee_id ?? null,
      status: input.status ?? 'new',
      created_by: authUser?.id ?? null,
    })
    .select(
      '*, assignee:users!backlog_items_assignee_id_fkey(*)'
    )
    .single()

  if (error) throw error
  return data as BacklogItem
}

// ---------------------------------------------------------------------------
// updateBacklogItem
// ---------------------------------------------------------------------------

export type UpdateBacklogInput = Partial<
  Pick<
    BacklogItem,
    'title' | 'description' | 'project_id' | 'priority' | 'estimated_hours' | 'assignee_id' | 'status'
  >
>

export async function updateBacklogItem(id: string, patch: UpdateBacklogInput): Promise<BacklogItem> {
  if (isMockMode()) {
    const idx = mockItems.findIndex((i) => i.id === id)
    if (idx < 0) throw new Error('Backlog item not found')
    mockItems[idx] = { ...mockItems[idx], ...patch, updated_at: new Date().toISOString() }
    return mockItems[idx]
  }

  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('backlog_items')
    .update(patch)
    .eq('id', id)
    .select(
      '*, assignee:users!backlog_items_assignee_id_fkey(*)'
    )
    .single()

  if (error) throw error
  return data as BacklogItem
}

// ---------------------------------------------------------------------------
// deleteBacklogItem
// ---------------------------------------------------------------------------

export async function deleteBacklogItem(id: string): Promise<void> {
  if (isMockMode()) {
    mockItems = mockItems.filter((i) => i.id !== id)
    return
  }

  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()

  const { error } = await supabase.from('backlog_items').delete().eq('id', id)
  if (error) throw error
}

// ---------------------------------------------------------------------------
// promoteBacklogItem — convert a backlog item into a real task
// ---------------------------------------------------------------------------

export async function promoteBacklogItem(
  id: string,
  opts: { clientName: string; confirmedDeadline?: string | null }
): Promise<Task> {
  const { createTask } = await import('@/lib/data/tasks')

  let item: BacklogItem | undefined
  if (isMockMode()) {
    item = mockItems.find((i) => i.id === id)
  } else {
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()
    const { data, error } = await supabase
      .from('backlog_items')
      .select('*')
      .eq('id', id)
      .single()
    if (error) throw error
    item = data as BacklogItem
  }
  if (!item) throw new Error('Backlog item not found')

  const step1 = {
    title: item.title,
    description: item.description ?? undefined,
    client_name: opts.clientName,
    desired_deadline: opts.confirmedDeadline ?? undefined,
    priority: item.priority,
    project_id: item.project_id ?? undefined,
  }
  const step2 =
    opts.confirmedDeadline && item.assignee_id
      ? {
          assigned_to: item.assignee_id,
          confirmed_deadline: opts.confirmedDeadline,
          estimated_hours: item.estimated_hours ?? null,
        }
      : undefined
  const task = await createTask(step1, step2)

  await updateBacklogItem(id, { status: 'promoted' })

  if (!isMockMode()) {
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('backlog_items')
      .update({ promoted_task_id: task.id })
      .eq('id', id)
  } else {
    const idx = mockItems.findIndex((i) => i.id === id)
    if (idx >= 0) mockItems[idx].promoted_task_id = task.id
  }

  return task
}
