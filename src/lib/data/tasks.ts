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
import { buildWeeklyPlan, buildWeeklyActual } from '@/lib/workload-utils'

// ---------------------------------------------------------------------------
// Activity log helper
// ---------------------------------------------------------------------------

// IMP_MC-1 / WEB-41: activity logging was silently failing because:
//   1. The column is `detail` (JSONB) per migration 006 — the previous code sent
//      `details` (plural string), which the DB rejected and the try/catch swallowed.
//   2. Callers passed `'updated'` as the action, but the activity_action enum only
//      accepts created|assigned|progress_updated|status_changed|hours_updated|
//      comment_added|deadline_changed|rejected. Unknown actions were silently lost.
// Callers must now pass a valid enum value. `detail` accepts free-form JSON
// (we wrap string details into { message: ... } so future structured payloads work).
const VALID_ACTIONS = new Set([
  'created', 'assigned', 'progress_updated', 'status_changed',
  'hours_updated', 'comment_added', 'deadline_changed', 'rejected',
])
async function logActivity(
  supabase: any,
  taskId: string,
  userId: string | null,
  action: string,
  details?: string | Record<string, unknown>
) {
  if (!VALID_ACTIONS.has(action)) {
    console.warn(`[activity_logs] skipping invalid action: ${action}`)
    return
  }
  try {
    const detail =
      details === undefined || details === null
        ? null
        : typeof details === 'string'
          ? { message: details }
          : details
    await supabase.from('activity_logs').insert({
      task_id: taskId,
      user_id: userId,
      action,
      detail,
      created_at: new Date().toISOString(),
    })
  } catch (err) {
    console.warn('[activity_logs] insert failed:', err)
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

  // Auto-calculate planned_hours_per_week and weekly_plan from estimated hours and lead time
  const estimatedHours = step2?.estimated_hours ?? null
  const deadline = step2?.confirmed_deadline || step1.desired_deadline || null
  let autoPlannedHoursPerWeek = 0
  let autoWeeklyPlan: Record<string, number> = {}
  if (estimatedHours && estimatedHours > 0 && deadline) {
    const startDate = new Date()
    const endDate = new Date(deadline)
    const totalMs = endDate.getTime() - startDate.getTime()
    const totalDays = Math.max(7, Math.ceil(totalMs / (1000 * 60 * 60 * 24)))
    const totalWeeks = Math.max(1, Math.ceil(totalDays / 7))
    autoPlannedHoursPerWeek = Math.round((estimatedHours / totalWeeks) * 10) / 10
    autoWeeklyPlan = buildWeeklyPlan(estimatedHours, startDate, endDate)
  }

  const templateDataWithPlan: Record<string, unknown> = {
    ...(step1.template_data ?? {}),
  }
  if (Object.keys(autoWeeklyPlan).length > 0) {
    templateDataWithPlan.weekly_plan = autoWeeklyPlan
  }

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
    estimated_hours: estimatedHours,
    planned_hours_per_week: autoPlannedHoursPerWeek,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    template_data: (Object.keys(templateDataWithPlan).length > 0 ? templateDataWithPlan : null) as any,
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
  data: Partial<Pick<Task, 'title' | 'description' | 'client_id' | 'project_id' | 'start_date' | 'desired_deadline' | 'confirmed_deadline' | 'status' | 'assigned_to' | 'priority' | 'planned_hours_per_week' | 'template_data' | 'actual_hours' | 'progress'>>
): Promise<Task> {
  if (isMockMode()) {
    const { updateMockTask } = await import('@/lib/mock/handlers')
    return updateMockTask(id, data)
  }

  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()

  // Auto-recalculate planned_hours_per_week and weekly_plan when start_date or deadline changes
  const updateData: Record<string, unknown> = { ...data, updated_at: new Date().toISOString() }
  const recalcFields = ['start_date', 'confirmed_deadline', 'desired_deadline'] as const
  const needsRecalc = recalcFields.some(f => f in data)
  if (needsRecalc) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: currentTask } = await (supabase as any).from('tasks').select('estimated_hours, start_date, confirmed_deadline, desired_deadline, created_at, template_data').eq('id', id).single()
    if (currentTask) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const merged = Object.assign({}, currentTask, data) as any
      const est = merged.estimated_hours ?? 0
      const deadline = merged.confirmed_deadline ?? merged.desired_deadline
      if (est > 0 && deadline) {
        const startDate = merged.start_date ? new Date(merged.start_date) : merged.created_at ? new Date(merged.created_at) : new Date()
        const endDate = new Date(deadline)
        const totalMs = endDate.getTime() - startDate.getTime()
        const totalDays = Math.max(7, Math.ceil(totalMs / (1000 * 60 * 60 * 24)))
        const totalWeeks = Math.max(1, Math.ceil(totalDays / 7))
        updateData.planned_hours_per_week = Math.round((est / totalWeeks) * 10) / 10
        // Also refresh template_data.weekly_plan with even distribution
        const newWeeklyPlan = buildWeeklyPlan(est, startDate, endDate)
        if (Object.keys(newWeeklyPlan).length > 0) {
          const existingTd = (merged.template_data ?? {}) as Record<string, unknown>
          updateData.template_data = { ...existingTd, weekly_plan: newWeeklyPlan }
        }
      }
    }
  }

  const { data: result, error } = await supabase
    .from('tasks')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error

  if (result) {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      const changedFields = Object.keys(data)
      // IMP_MC-1 / WEB-41: emit specific activity_action values per field type so the
      // activity log timeline (and the requester's "依頼履歴" view) can show what
      // actually changed — previously a generic 'updated' action was silently
      // rejected because it is not in the activity_action enum.
      if (changedFields.includes('desired_deadline') || changedFields.includes('confirmed_deadline')) {
        await logActivity(supabase, id, authUser?.id ?? null, 'deadline_changed', {
          desired_deadline: data.desired_deadline ?? null,
          confirmed_deadline: data.confirmed_deadline ?? null,
        })
      }
      if (changedFields.includes('status')) {
        await logActivity(supabase, id, authUser?.id ?? null, 'status_changed', {
          status: data.status,
        })
      }
      if (changedFields.includes('actual_hours')) {
        await logActivity(supabase, id, authUser?.id ?? null, 'hours_updated', {
          actual_hours: data.actual_hours ?? null,
        })
      }
      if (changedFields.includes('assigned_to')) {
        await logActivity(supabase, id, authUser?.id ?? null, 'assigned', {
          assigned_to: data.assigned_to ?? null,
        })
      }

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

      // Send completion notification when status changes to 'done'
      if (data.status === 'done' && authUser) {
        const { data: taskForComplete } = await supabase
          .from('tasks')
          .select('title, estimated_hours, actual_hours, requested_by, client:clients(name)')
          .eq('id', id)
          .single() as { data: any; error: any }
        if (taskForComplete?.requested_by) {
          const { data: requester } = await supabase
            .from('users')
            .select('id, name, email')
            .eq('id', taskForComplete.requested_by)
            .single()
          const { data: completer } = await supabase
            .from('users')
            .select('name')
            .eq('id', authUser.id)
            .single()
          if (requester?.email) {
            fetch('/api/email/notify-complete', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                taskId: id,
                taskTitle: taskForComplete.title ?? '',
                clientName: taskForComplete.client?.name ?? '',
                completedByName: completer?.name ?? '',
                estimatedHours: taskForComplete.estimated_hours ?? null,
                actualHours: taskForComplete.actual_hours ?? 0,
                requesterEmail: requester.email,
                requesterName: requester.name,
                completerId: authUser.id,
                requesterId: requester.id,
              }),
            }).catch((err) => {
              console.error('[updateTask] Completion email failed:', err)
            })
          }
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

  // Auto-populate template_data.weekly_actual based on progress
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: currentTask } = await (supabase as any)
    .from('tasks')
    .select('estimated_hours, start_date, created_at, confirmed_deadline, desired_deadline, template_data')
    .eq('id', id)
    .single()

  // Reverse sync: if actual_hours is provided, auto-compute progress from it
  // progress = round((actual_hours / estimated_hours) * 100), capped at 100
  let effectiveProgress = update.progress
  const est = currentTask?.estimated_hours ?? 0
  if (update.actual_hours !== undefined && update.actual_hours !== null && est > 0) {
    const computed = Math.min(100, Math.round((update.actual_hours / est) * 100))
    // If progress wasn't explicitly set OR actual_hours is the primary driver,
    // overwrite progress with the computed value
    if (update.progress === undefined || update.progress === null) {
      effectiveProgress = computed
    } else {
      // Both provided: prefer the one that changed. If actual differs from what
      // progress implies, treat actual_hours as authoritative.
      const impliedFromProgress = (est * (update.progress / 100))
      const diff = Math.abs(impliedFromProgress - update.actual_hours)
      if (diff > 0.1) {
        effectiveProgress = computed
      }
    }
  }

  const updatePayload: Record<string, unknown> = {
    progress: effectiveProgress,
    status: update.status,
    actual_hours: update.actual_hours,
    updated_at: new Date().toISOString(),
  }

  if (currentTask && effectiveProgress !== undefined && effectiveProgress > 0) {
    const sd = currentTask.start_date || currentTask.created_at
    const dl = currentTask.confirmed_deadline ?? currentTask.desired_deadline
    if (est > 0 && sd) {
      const weeklyActual = buildWeeklyActual(est, effectiveProgress, sd, dl)
      if (Object.keys(weeklyActual).length > 0) {
        const existingTd = (currentTask.template_data ?? {}) as Record<string, unknown>
        updatePayload.template_data = { ...existingTd, weekly_actual: weeklyActual }
      }
    }
  }

  const { data, error } = await supabase
    .from('tasks')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .update(updatePayload as any)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error

  if (data) {
    const { status } = update
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      await logActivity(supabase, id, authUser?.id ?? null, 'progress_updated', `Progress: ${update.progress}%, Status: ${update.status}`)

      // Send completion notification to requester
      if (status === 'done') {
        try {
          const { data: task } = await supabase
            .from('tasks')
            .select('title, estimated_hours, actual_hours, requested_by, client:clients(name)')
            .eq('id', id)
            .single() as { data: any; error: any }
          const { data: { user: authUser } } = await supabase.auth.getUser()
          if (task?.requested_by && authUser) {
            const { data: requester } = await supabase
              .from('users')
              .select('id, name, email')
              .eq('id', task.requested_by)
              .single()
            const { data: completer } = await supabase
              .from('users')
              .select('name')
              .eq('id', authUser.id)
              .single()
            if (requester?.email) {
              fetch('/api/email/notify-complete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  taskId: id,
                  taskTitle: task.title ?? '',
                  clientName: task.client?.name ?? '',
                  completedByName: completer?.name ?? '',
                  estimatedHours: task.estimated_hours ?? null,
                  actualHours: task.actual_hours ?? 0,
                  requesterEmail: requester.email,
                  requesterName: requester.name,
                  completerId: authUser.id,
                  requesterId: requester.id,
                }),
              }).catch((err) => {
                console.error('[updateTaskProgress] Completion email failed:', err)
              })
            }
          }
        } catch {}
      }
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
