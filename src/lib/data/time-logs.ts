// =============================================================================
// Data abstraction layer – Time Logs (REQ-17)
// =============================================================================

import type { TimeLog, TimeLogSummary } from '@/types/database'
import { isMockMode } from '@/lib/utils'
import { getMonday } from '@/lib/workload-utils'

// ---------------------------------------------------------------------------
// Mock data helpers
// ---------------------------------------------------------------------------

const mockTimeLogs: TimeLog[] = []

function getMockTimeLogs(taskId: string): TimeLog[] {
  return mockTimeLogs
    .filter((tl) => tl.task_id === taskId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
}

// ---------------------------------------------------------------------------
// getTimeLogs — list time entries for a task
// ---------------------------------------------------------------------------

export async function getTimeLogs(taskId: string): Promise<TimeLog[]> {
  if (isMockMode()) {
    return getMockTimeLogs(taskId)
  }

  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()

  const { data, error } = await supabase
    .from('time_logs')
    .select('*, user:users!time_logs_user_id_fkey(*)')
    .eq('task_id', taskId)
    .order('logged_date', { ascending: false })

  if (error) { console.warn("[Data]", error.message); return undefined as any }
  return (data as unknown as TimeLog[]) ?? []
}

// ---------------------------------------------------------------------------
// addTimeLog — log hours for a task
// ---------------------------------------------------------------------------

export interface AddTimeLogData {
  task_id: string
  user_id: string
  hours: number
  description: string
  logged_date: string
}

export async function addTimeLog(data: AddTimeLogData): Promise<TimeLog> {
  if (isMockMode()) {
    const entry: TimeLog = {
      id: crypto.randomUUID(),
      task_id: data.task_id,
      user_id: data.user_id,
      hours: data.hours,
      description: data.description,
      logged_date: data.logged_date,
      created_at: new Date().toISOString(),
    }
    mockTimeLogs.push(entry)
    return entry
  }

  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()

  const { data: row, error } = await supabase
    .from('time_logs')
    .insert({
      task_id: data.task_id,
      user_id: data.user_id,
      hours: data.hours,
      description: data.description,
      logged_date: data.logged_date,
    })
    .select('*, user:users!time_logs_user_id_fkey(*)')
    .single()

  if (error) { console.warn("[Data]", error.message); return undefined as any }

  // Sync time logs → weekly_actual + actual_hours + progress
  syncTimeLogsToWeeklyActual(data.task_id)

  return row as unknown as TimeLog
}

// ---------------------------------------------------------------------------
// deleteTimeLog — remove a time entry
// ---------------------------------------------------------------------------

export async function deleteTimeLog(id: string, taskId?: string): Promise<void> {
  if (isMockMode()) {
    const idx = mockTimeLogs.findIndex((tl) => tl.id === id)
    if (idx >= 0) mockTimeLogs.splice(idx, 1)
    return
  }

  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()

  // If taskId not provided, fetch it before deleting
  let resolvedTaskId = taskId
  if (!resolvedTaskId) {
    const { data: log } = await supabase.from('time_logs').select('task_id').eq('id', id).single()
    resolvedTaskId = log?.task_id
  }

  const { error } = await supabase.from('time_logs').delete().eq('id', id)
  if (error) { console.warn("[Data]", error.message); return undefined as any }

  // Sync time logs → weekly_actual + actual_hours + progress
  if (resolvedTaskId) syncTimeLogsToWeeklyActual(resolvedTaskId)
}

// ---------------------------------------------------------------------------
// syncTimeLogsToWeeklyActual — aggregate time logs by week → weekly_actual
// ---------------------------------------------------------------------------

async function syncTimeLogsToWeeklyActual(taskId: string): Promise<void> {
  if (isMockMode()) return
  try {
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()

    // Fetch all time logs for this task
    const { data: logs } = await supabase
      .from('time_logs')
      .select('hours, logged_date')
      .eq('task_id', taskId)

    // Aggregate by week (Monday key)
    const weeklyActual: Record<string, number> = {}
    let totalActual = 0
    for (const log of logs ?? []) {
      const hours = Number(log.hours) || 0
      totalActual += hours
      const monday = getMonday(new Date(log.logged_date))
      const y = monday.getFullYear()
      const m = String(monday.getMonth() + 1).padStart(2, '0')
      const d = String(monday.getDate()).padStart(2, '0')
      const key = `${y}-${m}-${d}`
      weeklyActual[key] = (weeklyActual[key] ?? 0) + Math.round(hours * 10) / 10
    }

    // Round values
    for (const k of Object.keys(weeklyActual)) {
      weeklyActual[k] = Math.round(weeklyActual[k] * 10) / 10
    }

    // Fetch current task template_data and estimated_hours
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: task } = await (supabase as any)
      .from('tasks')
      .select('template_data, estimated_hours')
      .eq('id', taskId)
      .single()

    const existingTd = (task?.template_data ?? {}) as Record<string, unknown>
    const est = task?.estimated_hours ?? 0
    const progress = est > 0 ? Math.min(100, Math.round((totalActual / est) * 100)) : undefined

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('tasks')
      .update({
        template_data: { ...existingTd, weekly_actual: weeklyActual },
        actual_hours: Math.round(totalActual * 10) / 10,
        ...(progress !== undefined ? { progress } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq('id', taskId)
  } catch (err) {
    console.error('[syncTimeLogsToWeeklyActual]', err)
  }
}

// ---------------------------------------------------------------------------
// getTimeLogSummary — total hours per user for a task
// ---------------------------------------------------------------------------

export async function getTimeLogSummary(
  taskId: string
): Promise<{ totalHours: number; byUser: TimeLogSummary[] }> {
  const logs = await getTimeLogs(taskId)

  const userMap = new Map<string, { name: string; hours: number }>()

  for (const log of logs) {
    const existing = userMap.get(log.user_id)
    if (existing) {
      existing.hours += Number(log.hours)
    } else {
      userMap.set(log.user_id, {
        name: log.user?.name ?? 'Unknown',
        hours: Number(log.hours),
      })
    }
  }

  const byUser: TimeLogSummary[] = Array.from(userMap.entries()).map(
    ([userId, info]) => ({
      user_id: userId,
      user_name: info.name,
      total_hours: info.hours,
    })
  )

  const totalHours = byUser.reduce((sum, u) => sum + u.total_hours, 0)

  return { totalHours, byUser }
}
