// =============================================================================
// Data abstraction layer – Time Logs (REQ-17)
// =============================================================================

import type { TimeLog, TimeLogSummary } from '@/types/database'
import { useMock } from '@/lib/utils'

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
  if (useMock()) {
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
  if (useMock()) {
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
  return row as unknown as TimeLog
}

// ---------------------------------------------------------------------------
// deleteTimeLog — remove a time entry
// ---------------------------------------------------------------------------

export async function deleteTimeLog(id: string): Promise<void> {
  if (useMock()) {
    const idx = mockTimeLogs.findIndex((tl) => tl.id === id)
    if (idx >= 0) mockTimeLogs.splice(idx, 1)
    return
  }

  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()

  const { error } = await supabase.from('time_logs').delete().eq('id', id)
  if (error) { console.warn("[Data]", error.message); return undefined as any }
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
