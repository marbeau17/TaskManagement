// =============================================================================
// Data abstraction layer – Workload
// =============================================================================

import type { User, Client } from '@/types/database'
import type { WorkloadSummary, WorkloadKpiData, ResourceLoadData, ResourceLoadEntry } from '@/types/workload'
import { isMockMode } from '@/lib/utils'
import { getTaskWeeklyHours } from '@/lib/workload-utils'

// ---------------------------------------------------------------------------
// getWorkloadSummaries
// ---------------------------------------------------------------------------

export async function getWorkloadSummaries(weekStart?: string): Promise<WorkloadSummary[]> {
  if (isMockMode()) {
    const { getMockWorkloadSummaries } = await import('@/lib/mock/handlers')
    return getMockWorkloadSummaries()
  }

  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()

  // Fetch active users with their assigned tasks
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('*')
    .eq('is_active', true)

  if (usersError) throw usersError
  const typedUsers = (users ?? []) as User[]

  // Fetch all non-rejected tasks with an assignee
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: tasks, error: tasksError } = await (supabase as any)
    .from('tasks')
    .select('id, assigned_to, status, estimated_hours, actual_hours, progress, start_date, planned_hours_per_week, template_data, confirmed_deadline, desired_deadline')
    .not('assigned_to', 'is', null)
    .neq('status', 'rejected')

  if (tasksError) throw tasksError

  // Also fetch task_assignees for multi-assignee support
  let taskAssigneeMap: Record<string, string[]> = {}
  try {
    const { data: assigneeRows } = await (supabase as any)
      .from('task_assignees')
      .select('task_id, user_id')
    if (assigneeRows) {
      for (const row of assigneeRows) {
        if (!taskAssigneeMap[row.task_id]) taskAssigneeMap[row.task_id] = []
        taskAssigneeMap[row.task_id].push(row.user_id)
      }
    }
  } catch {
    // task_assignees table might not exist yet - graceful fallback
  }

  // Filter tasks by week if weekStart provided
  let filteredTasks = tasks ?? []
  if (weekStart) {
    const start = new Date(weekStart)
    const end = new Date(start)
    end.setDate(end.getDate() + 6)
    const endStr = end.toISOString().slice(0, 10)
    filteredTasks = filteredTasks.filter((t: any) => {
      const deadline = t.confirmed_deadline ?? t.desired_deadline
      if (!deadline) return true // no deadline = include
      // Include tasks with deadline up to end of this week
      // (tasks are being worked on until their deadline)
      return deadline <= endStr
    })
  }

  const summaries: WorkloadSummary[] = typedUsers.map((user) => {
    const allUserTasks = filteredTasks.filter((t: any) => {
      // Primary assignee
      if (t.assigned_to === user.id) return true
      // Multi-assignee via task_assignees table
      const taskAssignees = taskAssigneeMap[t.id]
      if (taskAssignees && taskAssignees.includes(user.id)) return true
      return false
    })
    const activeTasks = allUserTasks.filter((t: any) => t.status === 'todo' || t.status === 'in_progress')
    const completedTasks = allUserTasks.filter((t: any) => t.status === 'done')
    const estimatedHours = activeTasks.reduce(
      (sum: number, t: any) => {
        const rawHours = getTaskWeeklyHours(t, weekStart)
        // Divide by number of assignees (including primary)
        const assignees = taskAssigneeMap[t.id]
        const assigneeCount = assignees ? assignees.length : 1
        return sum + (rawHours / assigneeCount)
      },
      0
    )
    const actualHours = activeTasks.reduce(
      (sum: number, t: any) => {
        let hours: number
        if ((t.actual_hours ?? 0) > 0) {
          hours = t.actual_hours
        } else {
          hours = ((t.progress ?? 0) / 100) * (t.estimated_hours ?? 0)
        }
        const assignees = taskAssigneeMap[t.id]
        const assigneeCount = assignees ? assignees.length : 1
        return sum + (hours / assigneeCount)
      },
      0
    )
    const capacityHours = user.weekly_capacity_hours
    const utilizationRate =
      capacityHours > 0
        ? Math.round((estimatedHours / capacityHours) * 100)
        : 0

    let status: WorkloadSummary['status'] = 'normal'
    if (utilizationRate >= 100) status = 'overloaded'
    else if (utilizationRate >= 80) status = 'warning'
    else if (utilizationRate < 30) status = 'available'

    return {
      user,
      task_count: allUserTasks.length,
      completed_count: completedTasks.length,
      estimated_hours: Math.round(estimatedHours * 10) / 10,
      actual_hours: Math.round(actualHours * 10) / 10,
      capacity_hours: capacityHours,
      utilization_rate: utilizationRate,
      status,
    }
  })

  return summaries
}

// ---------------------------------------------------------------------------
// getWorkloadKpi
// ---------------------------------------------------------------------------

export async function getWorkloadKpi(): Promise<WorkloadKpiData> {
  if (isMockMode()) {
    const { getMockWorkloadKpi } = await import('@/lib/mock/handlers')
    return getMockWorkloadKpi()
  }

  // Leverage summaries to derive KPIs
  const summaries = await getWorkloadSummaries()

  const totalEstimated = summaries.reduce(
    (sum, s) => sum + s.estimated_hours,
    0
  )
  const totalActual = summaries.reduce((sum, s) => sum + s.actual_hours, 0)
  const totalCount = summaries.reduce((sum, s) => sum + s.task_count, 0)
  const completedCount = summaries.reduce(
    (sum, s) => sum + s.completed_count,
    0
  )
  const teamAvgUtilization =
    summaries.length > 0
      ? Math.round(
          summaries.reduce((sum, s) => sum + s.utilization_rate, 0) /
            summaries.length
        )
      : 0

  const overloadedMembers = summaries
    .filter((s) => s.status === 'overloaded')
    .map((s) => s.user.name)

  return {
    team_avg_utilization: teamAvgUtilization,
    total_actual_hours: totalActual,
    total_estimated_hours: totalEstimated,
    completion_rate:
      totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0,
    completed_count: completedCount,
    total_count: totalCount,
    overloaded_count: overloadedMembers.length,
    overloaded_members: overloadedMembers,
  }
}

// ---------------------------------------------------------------------------
// getResourceLoadData — per-member hours broken down by client
// ---------------------------------------------------------------------------

export async function getResourceLoadData(): Promise<ResourceLoadData> {
  if (isMockMode()) {
    const { getMockResourceLoadData } = await import('@/lib/mock/handlers')
    return getMockResourceLoadData()
  }

  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()

  // Fetch active users
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('*')
    .eq('is_active', true)

  if (usersError) throw usersError
  const typedUsers = (users ?? []) as User[]

  // Fetch clients for name mapping
  const { data: clientRows, error: clientsError } = await supabase
    .from('clients')
    .select('id, name')

  if (clientsError) throw clientsError
  const clientNameMap = new Map(
    ((clientRows ?? []) as Client[]).map((c) => [c.id, c.name])
  )

  // Fetch active tasks with assignees
  const { data: tasks, error: tasksError } = await supabase
    .from('tasks')
    .select('id, assigned_to, client_id, status, estimated_hours')
    .not('assigned_to', 'is', null)
    .neq('status', 'rejected')
    .neq('status', 'done')

  if (tasksError) throw tasksError

  // Also fetch task_assignees for multi-assignee support
  let resourceTaskAssigneeMap: Record<string, string[]> = {}
  try {
    const { data: assigneeRows } = await (supabase as any)
      .from('task_assignees')
      .select('task_id, user_id')
    if (assigneeRows) {
      for (const row of assigneeRows) {
        if (!resourceTaskAssigneeMap[row.task_id]) resourceTaskAssigneeMap[row.task_id] = []
        resourceTaskAssigneeMap[row.task_id].push(row.user_id)
      }
    }
  } catch {
    // task_assignees table might not exist yet - graceful fallback
  }

  const allClientNames = new Set<string>()

  const entries: ResourceLoadEntry[] = typedUsers.map((user) => {
    const userTasks = (tasks ?? []).filter((t: any) => {
      if (t.assigned_to === user.id) return true
      const taskAssignees = resourceTaskAssigneeMap[t.id]
      if (taskAssignees && taskAssignees.includes(user.id)) return true
      return false
    })

    const clientHours: Record<string, number> = {}
    for (const t of userTasks) {
      const clientName = clientNameMap.get(t.client_id) ?? '未分類'
      allClientNames.add(clientName)
      // Divide by number of assignees for multi-assignee tasks
      const assignees = resourceTaskAssigneeMap[t.id]
      const assigneeCount = assignees ? assignees.length : 1
      clientHours[clientName] =
        (clientHours[clientName] ?? 0) + ((t.estimated_hours ?? 0) / assigneeCount)
    }

    const totalAssigned = Object.values(clientHours).reduce(
      (s, v) => s + v,
      0
    )
    const cap = user.weekly_capacity_hours
    const rate = cap > 0 ? Math.round((totalAssigned / cap) * 100) : 0

    return {
      user_id: user.id,
      user_name: user.name,
      user_name_short: user.name_short,
      capacity_hours: cap,
      total_assigned_hours: totalAssigned,
      utilization_rate: rate,
      client_hours: clientHours,
    }
  })

  return {
    entries,
    client_names: Array.from(allClientNames).sort(),
  }
}
