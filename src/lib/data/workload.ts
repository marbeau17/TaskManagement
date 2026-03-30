// =============================================================================
// Data abstraction layer – Workload
// =============================================================================

import type { User, Client } from '@/types/database'
import type { WorkloadSummary, WorkloadKpiData, ResourceLoadData, ResourceLoadEntry } from '@/types/workload'
import { useMock } from '@/lib/utils'

// ---------------------------------------------------------------------------
// getWorkloadSummaries
// ---------------------------------------------------------------------------

export async function getWorkloadSummaries(weekStart?: string): Promise<WorkloadSummary[]> {
  if (useMock()) {
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

  // Fetch only active (non-done) tasks with an assignee
  const { data: tasks, error: tasksError } = await supabase
    .from('tasks')
    .select('assigned_to, status, estimated_hours, actual_hours, confirmed_deadline, desired_deadline')
    .not('assigned_to', 'is', null)
    .in('status', ['todo', 'in_progress'])

  if (tasksError) throw tasksError

  // Filter tasks by week if weekStart provided
  let filteredTasks = tasks ?? []
  if (weekStart) {
    const start = new Date(weekStart)
    const end = new Date(start)
    end.setDate(end.getDate() + 6)
    const startStr = start.toISOString().slice(0, 10)
    const endStr = end.toISOString().slice(0, 10)
    filteredTasks = filteredTasks.filter((t: any) => {
      const deadline = t.confirmed_deadline ?? t.desired_deadline
      if (!deadline) return true // tasks with no deadline count for current week
      return deadline >= startStr && deadline <= endStr
    })
  }

  const summaries: WorkloadSummary[] = typedUsers.map((user) => {
    const userTasks = filteredTasks.filter((t) => t.assigned_to === user.id)
    const completedTasks = userTasks.filter((t) => t.status === 'done')
    const estimatedHours = userTasks.reduce(
      (sum, t) => sum + (t.estimated_hours ?? 0),
      0
    )
    const actualHours = userTasks.reduce(
      (sum, t) => sum + (t.actual_hours ?? 0),
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
      task_count: userTasks.length,
      completed_count: completedTasks.length,
      estimated_hours: estimatedHours,
      actual_hours: actualHours,
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
  if (useMock()) {
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
  if (useMock()) {
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
    .select('assigned_to, client_id, status, estimated_hours')
    .not('assigned_to', 'is', null)
    .neq('status', 'rejected')
    .neq('status', 'done')

  if (tasksError) throw tasksError

  const allClientNames = new Set<string>()

  const entries: ResourceLoadEntry[] = typedUsers.map((user) => {
    const userTasks = (tasks ?? []).filter((t) => t.assigned_to === user.id)

    const clientHours: Record<string, number> = {}
    for (const t of userTasks) {
      const clientName = clientNameMap.get(t.client_id) ?? '未分類'
      allClientNames.add(clientName)
      clientHours[clientName] =
        (clientHours[clientName] ?? 0) + (t.estimated_hours ?? 0)
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
