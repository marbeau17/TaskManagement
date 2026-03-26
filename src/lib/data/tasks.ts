// =============================================================================
// Data abstraction layer – Tasks
// Switches between mock handlers and Supabase depending on Supabase URL config
// =============================================================================

import type {
  Task,
  TaskStatus,
  TaskWithRelations,
  Comment,
  ActivityLog,
  Attachment,
} from '@/types/database'
import type {
  TaskFilters,
  TaskFormStep1,
  TaskFormStep2,
  TaskProgressUpdate,
} from '@/types/task'
import { useMock } from '@/lib/utils'

// ---------------------------------------------------------------------------
// getTasks
// ---------------------------------------------------------------------------

export async function getTasks(
  filters?: TaskFilters
): Promise<TaskWithRelations[]> {
  if (useMock()) {
    const { getMockTasks } = await import('@/lib/mock/handlers')
    return getMockTasks(filters)
  }

  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()

  let query = supabase
    .from('tasks')
    .select(
      '*, client:clients!client_id(*), assigned_user:users!tasks_assigned_to_fkey(*), requester:users!tasks_requested_by_fkey(*), director:users!tasks_director_id_fkey(*)'
    )

  if (filters?.status && filters.status !== 'all') {
    query = query.eq('status', filters.status)
  }

  if (filters?.client_id) {
    query = query.eq('client_id', filters.client_id)
  }

  if (filters?.project_id) {
    query = query.eq('project_id', filters.project_id)
  }

  if (filters?.assigned_to) {
    query = query.eq('assigned_to', filters.assigned_to)
  }

  if (filters?.requested_by) {
    query = query.eq('requested_by', filters.requested_by)
  }

  if (filters?.search) {
    query = query.ilike('title', `%${filters.search}%`)
  }

  if (filters?.period === 'week') {
    const now = new Date()
    // Monday-based week start
    const day = now.getDay()
    const diffToMonday = day === 0 ? 6 : day - 1
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - diffToMonday)
    startOfWeek.setHours(0, 0, 0, 0)
    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 7)
    query = query
      .gte('confirmed_deadline', startOfWeek.toISOString())
      .lt('confirmed_deadline', endOfWeek.toISOString())
  } else if (filters?.period === 'month') {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    query = query
      .gte('confirmed_deadline', startOfMonth.toISOString())
      .lt('confirmed_deadline', endOfMonth.toISOString())
  }

  query = query.order('created_at', { ascending: false })

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as TaskWithRelations[]
}

// ---------------------------------------------------------------------------
// getTaskById
// ---------------------------------------------------------------------------

export async function getTaskById(
  id: string
): Promise<TaskWithRelations | null> {
  if (useMock()) {
    const { getMockTaskById } = await import('@/lib/mock/handlers')
    return getMockTaskById(id)
  }

  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()

  const { data, error } = await supabase
    .from('tasks')
    .select(
      '*, client:clients!client_id(*), assigned_user:users!tasks_assigned_to_fkey(*), requester:users!tasks_requested_by_fkey(*), director:users!tasks_director_id_fkey(*)'
    )
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null // not found
    throw error
  }
  return data as TaskWithRelations
}

// ---------------------------------------------------------------------------
// createTask
// ---------------------------------------------------------------------------

export async function createTask(
  step1: TaskFormStep1,
  step2?: TaskFormStep2
): Promise<Task> {
  if (useMock()) {
    const { createMockTask } = await import('@/lib/mock/handlers')
    return createMockTask(step1, step2)
  }

  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()

  // Resolve or create client by name
  let clientId: string
  const { data: existingClient } = await supabase
    .from('clients')
    .select('id')
    .eq('name', step1.client_name)
    .single()

  if (existingClient) {
    clientId = existingClient.id
  } else {
    const { data: newClient, error: clientError } = await supabase
      .from('clients')
      .insert({ name: step1.client_name })
      .select('id')
      .single()
    if (clientError) throw clientError
    clientId = newClient!.id
  }

  // Get current user
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()
  if (!authUser) throw new Error('Not authenticated')

  const insertPayload = {
    client_id: clientId,
    title: step1.title,
    description: step1.description ?? null,
    desired_deadline: step1.desired_deadline ?? null,
    reference_url: step1.reference_url ?? null,
    requested_by: authUser.id,
    status: step2 ? 'todo' : 'waiting',
    is_draft: !step2,
    progress: 0,
    actual_hours: 0,
    assigned_to: step2?.assigned_to ?? null,
    confirmed_deadline: step2?.confirmed_deadline ?? null,
    estimated_hours: step2?.estimated_hours ?? null,
  }

  const { data, error } = await supabase
    .from('tasks')
    .insert(insertPayload)
    .select()
    .single()

  if (error) throw error
  return data as Task
}

// ---------------------------------------------------------------------------
// updateTaskProgress
// ---------------------------------------------------------------------------

export async function updateTaskProgress(
  id: string,
  update: TaskProgressUpdate
): Promise<Task> {
  if (useMock()) {
    const { updateMockTaskProgress } = await import('@/lib/mock/handlers')
    return updateMockTaskProgress(id, update)
  }

  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()

  const { data, error } = await supabase
    .from('tasks')
    .update({
      progress: update.progress,
      status: update.status,
      actual_hours: update.actual_hours,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as Task
}

// ---------------------------------------------------------------------------
// assignTask
// ---------------------------------------------------------------------------

export async function assignTask(
  id: string,
  data: TaskFormStep2
): Promise<Task> {
  if (useMock()) {
    const { assignMockTask } = await import('@/lib/mock/handlers')
    return assignMockTask(id, data)
  }

  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()

  // Get current user as director
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  const { data: updated, error } = await supabase
    .from('tasks')
    .update({
      assigned_to: data.assigned_to,
      confirmed_deadline: data.confirmed_deadline,
      estimated_hours: data.estimated_hours,
      director_id: authUser?.id ?? null,
      status: 'todo',
      is_draft: false,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return updated as Task
}

// ---------------------------------------------------------------------------
// bulkUpdateTaskStatus
// ---------------------------------------------------------------------------

export async function bulkUpdateTaskStatus(
  taskIds: string[],
  status: TaskStatus
): Promise<void> {
  if (useMock()) {
    const { bulkUpdateMockTaskStatus } = await import('@/lib/mock/handlers')
    return bulkUpdateMockTaskStatus(taskIds, status)
  }

  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()

  const { error } = await supabase
    .from('tasks')
    .update({ status })
    .in('id', taskIds)

  if (error) throw error
}

// ---------------------------------------------------------------------------
// getComments
// ---------------------------------------------------------------------------

export async function getComments(taskId: string): Promise<Comment[]> {
  if (useMock()) {
    const { getMockComments } = await import('@/lib/mock/handlers')
    return getMockComments(taskId)
  }

  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()

  const { data, error } = await supabase
    .from('comments')
    .select('*, user:users!comments_user_id_fkey(*)')
    .eq('task_id', taskId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return (data ?? []) as Comment[]
}

// ---------------------------------------------------------------------------
// addComment
// ---------------------------------------------------------------------------

export async function addComment(
  taskId: string,
  body: string
): Promise<Comment> {
  if (useMock()) {
    const { addMockComment } = await import('@/lib/mock/handlers')
    return addMockComment(taskId, body)
  }

  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()
  if (!authUser) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('comments')
    .insert({
      task_id: taskId,
      user_id: authUser.id,
      body,
    })
    .select('*, user:users!comments_user_id_fkey(*)')
    .single()

  if (error) throw error
  return data as Comment
}

// ---------------------------------------------------------------------------
// getActivityLogs
// ---------------------------------------------------------------------------

export async function getActivityLogs(taskId: string): Promise<ActivityLog[]> {
  if (useMock()) {
    const { getMockActivityLogs } = await import('@/lib/mock/handlers')
    return getMockActivityLogs(taskId)
  }

  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()

  const { data, error } = await supabase
    .from('activity_logs')
    .select('*, user:users!activity_logs_user_id_fkey(*)')
    .eq('task_id', taskId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as ActivityLog[]
}

// ---------------------------------------------------------------------------
// addAttachmentRecord
// ---------------------------------------------------------------------------

export async function addAttachmentRecord(
  taskId: string,
  file: { file_name: string; file_size: number; mime_type: string; storage_path: string }
): Promise<Attachment> {
  if (useMock()) {
    const { addMockAttachment } = await import('@/lib/mock/handlers')
    return addMockAttachment(taskId, file)
  }

  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()
  if (!authUser) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('attachments')
    .insert({
      task_id: taskId,
      uploaded_by: authUser.id,
      file_name: file.file_name,
      file_size: file.file_size,
      mime_type: file.mime_type,
      storage_path: file.storage_path,
    })
    .select('*, uploader:users!attachments_uploaded_by_fkey(*)')
    .single()

  if (error) throw error
  return data as Attachment
}

// ---------------------------------------------------------------------------
// getAttachments
// ---------------------------------------------------------------------------

export async function getAttachments(taskId: string): Promise<Attachment[]> {
  if (useMock()) {
    const { getMockAttachments } = await import('@/lib/mock/handlers')
    return getMockAttachments(taskId)
  }

  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()

  const { data, error } = await supabase
    .from('attachments')
    .select('*, uploader:users!attachments_uploaded_by_fkey(*)')
    .eq('task_id', taskId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as Attachment[]
}

// ---------------------------------------------------------------------------
// getRecentActivityLogs (across all tasks)
// ---------------------------------------------------------------------------

export interface ActivityLogWithTask extends ActivityLog {
  task?: { id: string; title: string }
}

export async function getRecentActivityLogs(
  limit = 5
): Promise<ActivityLogWithTask[]> {
  if (useMock()) {
    const { getMockRecentActivityLogs } = await import('@/lib/mock/handlers')
    return getMockRecentActivityLogs(limit)
  }

  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()

  const { data, error } = await supabase
    .from('activity_logs')
    .select('*, user:users!activity_logs_user_id_fkey(*), task:tasks!activity_logs_task_id_fkey(id, title)')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return (data ?? []) as ActivityLogWithTask[]
}
