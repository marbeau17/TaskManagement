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
  PaginationParams,
  PaginatedResult,
} from '@/types/task'
import { isMockMode } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Activity log helper
// ---------------------------------------------------------------------------

async function logActivity(
  supabase: any,
  taskId: string,
  userId: string | null,
  action: string,
  details?: string
) {
  try {
    await supabase.from('activity_logs').insert({
      task_id: taskId,
      user_id: userId,
      action,
      details: details ?? null,
      created_at: new Date().toISOString(),
    })
  } catch {
    // Activity logging is non-critical - don't fail the main operation
  }
}

// ---------------------------------------------------------------------------
// Status transition validation (for future use)
// ---------------------------------------------------------------------------

const VALID_TASK_TRANSITIONS: Record<string, string[]> = {
  waiting: ['todo', 'rejected'],
  todo: ['in_progress', 'waiting', 'rejected'],
  in_progress: ['done', 'reviewing', 'todo', 'rejected'],
  reviewing: ['done', 'in_progress', 'rejected'],
  done: ['in_progress', 'todo'],
  rejected: ['todo', 'waiting'],
}

function isValidTaskTransition(from: string, to: string): boolean {
  if (from === to) return true
  return VALID_TASK_TRANSITIONS[from]?.includes(to) ?? false
}

// ---------------------------------------------------------------------------
// getTasks
// ---------------------------------------------------------------------------

export async function getTasks(
  filters?: TaskFilters,
  pagination?: PaginationParams
): Promise<PaginatedResult<TaskWithRelations>> {
  if (isMockMode()) {
    const { getMockTasks } = await import('@/lib/mock/handlers')
    const all = getMockTasks(filters)
    if (pagination) {
      const { page, pageSize } = pagination
      const start = (page - 1) * pageSize
      return { data: all.slice(start, start + pageSize), totalCount: all.length }
    }
    return { data: all, totalCount: all.length }
  }

  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()

  let query = supabase
    .from('tasks')
    .select(
      '*, client:clients!client_id(*), project:projects!project_id(id, name), assigned_user:users!tasks_assigned_to_fkey(*), requester:users!tasks_requested_by_fkey(*), director:users!tasks_director_id_fkey(*), assignees:task_assignees(*, user:users!task_assignees_user_id_fkey(*))',
      { count: 'exact' }
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

  if (filters?.parent_task_id !== undefined) {
    if (filters.parent_task_id === null) {
      query = query.is('parent_task_id', null)
    } else {
      query = query.eq('parent_task_id', filters.parent_task_id)
    }
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

  // Apply pagination range
  if (pagination) {
    const { page, pageSize } = pagination
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    query = query.range(from, to)
  }

  const { data, error, count } = await query
  if (error) throw error
  return { data: (data ?? []) as unknown as TaskWithRelations[], totalCount: count ?? 0 }
}

// ---------------------------------------------------------------------------
// getWaitingTaskCount – lightweight count for sidebar badge
// ---------------------------------------------------------------------------

export async function getWaitingTaskCount(): Promise<number> {
  if (isMockMode()) {
    const { getMockTasks } = await import('@/lib/mock/handlers')
    const all = getMockTasks()
    return all.filter((t) => t.status === 'waiting').length
  }

  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()
  const { count, error } = await supabase
    .from('tasks')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'waiting')

  if (error) throw error
  return count ?? 0
}

// ---------------------------------------------------------------------------
// getTaskById
// ---------------------------------------------------------------------------

export async function getTaskById(
  id: string
): Promise<TaskWithRelations | null> {
  if (isMockMode()) {
    const { getMockTaskById } = await import('@/lib/mock/handlers')
    return getMockTaskById(id)
  }

  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()

  const { data, error } = await supabase
    .from('tasks')
    .select(
      '*, client:clients!client_id(*), assigned_user:users!tasks_assigned_to_fkey(*), requester:users!tasks_requested_by_fkey(*), director:users!tasks_director_id_fkey(*), assignees:task_assignees(*, user:users!task_assignees_user_id_fkey(*))'
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
  if (isMockMode()) {
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
    assigned_to: step2?.assigned_to || null,  // Guard: empty string → null
    confirmed_deadline: step2?.confirmed_deadline || null,
    estimated_hours: step2?.estimated_hours ?? null,
    priority: step1.priority ?? 3,
    project_id: step1.project_id ?? null,
    parent_task_id: step1.parent_task_id ?? null,
    wbs_code: step1.wbs_code ?? '',
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
// getSubtasks
// ---------------------------------------------------------------------------

export async function getSubtasks(
  parentId: string
): Promise<TaskWithRelations[]> {
  if (isMockMode()) {
    const { getMockSubtasks } = await import('@/lib/mock/handlers')
    return getMockSubtasks(parentId)
  }

  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()

  const { data, error } = await supabase
    .from('tasks')
    .select(
      '*, client:clients!client_id(*), assigned_user:users!tasks_assigned_to_fkey(*), requester:users!tasks_requested_by_fkey(*), director:users!tasks_director_id_fkey(*)'
    )
    .eq('parent_task_id', parentId)
    .order('wbs_code', { ascending: true })

  if (error) throw error
  return (data ?? []) as TaskWithRelations[]
}

// ---------------------------------------------------------------------------
// updateTask — generic field update
// ---------------------------------------------------------------------------

export async function updateTask(
  id: string,
  data: Partial<Pick<Task, 'title' | 'description' | 'client_id' | 'project_id' | 'start_date' | 'desired_deadline' | 'confirmed_deadline' | 'status' | 'assigned_to' | 'priority' | 'planned_hours_per_week' | 'template_data'>>
): Promise<Task> {
  if (isMockMode()) {
    const { updateMockTask } = await import('@/lib/mock/handlers')
    return updateMockTask(id, data)
  }

  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()

  const { data: result, error } = await supabase
    .from('tasks')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error

  if (result) {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      const fields = Object.keys(data).join(', ')
      await logActivity(supabase, id, authUser?.id ?? null, 'updated', `Fields: ${fields}`)

      // Send email notification when assigned_to changes (reassignment)
      if (data.assigned_to && authUser) {
        const { data: assignee } = await supabase
          .from('users')
          .select('id, name, email')
          .eq('id', data.assigned_to)
          .single()
        const { data: task } = await supabase
          .from('tasks')
          .select('title, description, confirmed_deadline, estimated_hours, client:clients(name)')
          .eq('id', id)
          .single() as { data: any; error: any }
        const { data: director } = await supabase
          .from('users')
          .select('name')
          .eq('id', authUser.id)
          .single()

        if (assignee?.email && task) {
          fetch('/api/email/notify-assign', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              taskId: id,
              taskTitle: task.title ?? '',
              clientName: task.client?.name ?? '',
              confirmedDeadline: task.confirmed_deadline ?? null,
              estimatedHours: task.estimated_hours ?? null,
              directorName: director?.name ?? '',
              description: task.description ?? null,
              assigneeEmail: assignee.email,
              assigneeName: assignee.name,
              assignerId: authUser.id,
              assigneeId: assignee.id,
            }),
          }).catch((err) => {
            console.error('[updateTask] Reassignment email failed:', err)
          })
        }
      }
    } catch {}
  }

  return result as Task
}

// ---------------------------------------------------------------------------
// updateTaskProgress
// ---------------------------------------------------------------------------

export async function updateTaskProgress(
  id: string,
  update: TaskProgressUpdate
): Promise<Task> {
  if (isMockMode()) {
    const { updateMockTaskProgress } = await import('@/lib/mock/handlers')
    return updateMockTaskProgress(id, update)
  }

  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()

  // TODO: Validate status transition once current status is available
  // if (update.status && currentStatus && !isValidTaskTransition(currentStatus, update.status)) {
  //   throw new Error(`Invalid status transition from ${currentStatus} to ${update.status}`)
  // }

  const { data, error } = await supabase
    .from('tasks')
    .update({
      progress: update.progress,
      status: update.status,
      actual_hours: update.actual_hours,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error

  if (data) {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      await logActivity(supabase, id, authUser?.id ?? null, 'progress_updated', `Progress: ${update.progress}%, Status: ${update.status}`)
    } catch {}
  }

  return data as Task
}

// ---------------------------------------------------------------------------
// assignTask
// ---------------------------------------------------------------------------

export async function assignTask(
  id: string,
  data: TaskFormStep2
): Promise<Task> {
  if (isMockMode()) {
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
      assigned_to: data.assigned_to || null,  // Guard: empty string → null
      confirmed_deadline: data.confirmed_deadline || null,
      estimated_hours: data.estimated_hours,
      director_id: authUser?.id ?? null,
      status: 'todo',
      is_draft: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error

  if (updated) {
    try {
      await logActivity(supabase, id, authUser?.id ?? null, 'assigned', `Assigned to: ${data.assigned_to}`)
    } catch {}
  }

  // Send email notification via API route (fire-and-forget, avoids nodemailer in client bundle)
  if (process.env.NEXT_PUBLIC_USE_MOCK !== 'true' && data.assigned_to) {
    const { data: assignee } = await supabase
      .from('users')
      .select('id, name, email')
      .eq('id', data.assigned_to)
      .single()

    const { data: director } = authUser
      ? await supabase.from('users').select('name').eq('id', authUser.id).single()
      : { data: null }

    const task = await getTaskById(id)

    if (assignee?.email && task) {
      fetch('/api/email/notify-assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: id,
          taskTitle: task.title,
          clientName: task.client?.name ?? '',
          confirmedDeadline: data.confirmed_deadline ?? null,
          estimatedHours: data.estimated_hours ?? null,
          directorName: director?.name ?? '',
          description: task.description ?? null,
          assigneeEmail: assignee.email,
          assigneeName: assignee.name,
          assignerId: authUser?.id ?? '',
          assigneeId: assignee.id,
        }),
      }).catch((err) => {
        console.error('[assignTask] Email notification failed:', err)
      })
    }
  }

  return updated as Task
}

// ---------------------------------------------------------------------------
// bulkUpdateTaskStatus
// ---------------------------------------------------------------------------

export async function bulkUpdateTaskStatus(
  taskIds: string[],
  status: TaskStatus
): Promise<void> {
  if (isMockMode()) {
    const { bulkUpdateMockTaskStatus } = await import('@/lib/mock/handlers')
    return bulkUpdateMockTaskStatus(taskIds, status)
  }

  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()

  const { error } = await supabase
    .from('tasks')
    .update({ status, updated_at: new Date().toISOString() })
    .in('id', taskIds)

  if (error) throw error
}

// ---------------------------------------------------------------------------
// bulkAssignTasks
// ---------------------------------------------------------------------------

export async function bulkAssignTasks(taskIds: string[], userId: string): Promise<void> {
  if (isMockMode()) {
    const { bulkAssignMockTasks } = await import('@/lib/mock/handlers')
    return bulkAssignMockTasks(taskIds, userId)
  }
  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()
  const { error } = await supabase.from('tasks').update({ assigned_to: userId, updated_at: new Date().toISOString() }).in('id', taskIds)
  if (error) throw error
}

// ---------------------------------------------------------------------------
// cloneTask
// ---------------------------------------------------------------------------

export async function cloneTask(taskId: string): Promise<Task> {
  const original = await getTaskById(taskId)
  if (!original) throw new Error('Task not found')

  const newTask: TaskFormStep1 = {
    client_name: original.client?.name || '',
    title: `Copy of ${original.title}`,
    description: original.description || '',
    desired_deadline: original.desired_deadline || '',
    reference_url: original.reference_url || '',
  }

  return createTask(newTask)
}

// ---------------------------------------------------------------------------
// bulkDeleteTasks
// ---------------------------------------------------------------------------

export async function bulkDeleteTasks(taskIds: string[], force = false): Promise<void> {
  if (isMockMode()) {
    const { bulkDeleteMockTasks } = await import('@/lib/mock/handlers')
    return bulkDeleteMockTasks(taskIds)
  }
  // Use server-side API route to bypass RLS restrictions
  const res = await fetch('/api/tasks/delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ taskIds, force }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.error || 'Delete failed')
  }
}

// ---------------------------------------------------------------------------
// deleteAttachmentRecord
// ---------------------------------------------------------------------------

export async function deleteAttachmentRecord(attachmentId: string): Promise<void> {
  if (isMockMode()) {
    const { deleteMockAttachment } = await import('@/lib/mock/handlers')
    deleteMockAttachment(attachmentId)
    return
  }
  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()
  const { error } = await supabase.from('attachments').delete().eq('id', attachmentId)
  if (error) throw error
}

// ---------------------------------------------------------------------------
// getComments
// ---------------------------------------------------------------------------

export async function getComments(taskId: string): Promise<Comment[]> {
  if (isMockMode()) {
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
  if (isMockMode()) {
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
  if (isMockMode()) {
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
  if (isMockMode()) {
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
  if (isMockMode()) {
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
  if (isMockMode()) {
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
