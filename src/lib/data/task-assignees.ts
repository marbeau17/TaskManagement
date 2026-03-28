// =============================================================================
// Data abstraction layer – Task Assignees (multi-person assignment)
// Switches between mock handlers and Supabase depending on Supabase URL config
// =============================================================================

import type { TaskAssignee } from '@/types/database'
import { useMock } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Mock in-memory store
// ---------------------------------------------------------------------------

let mockAssignees: TaskAssignee[] = []
let mockIdCounter = 1

function getMockAssignees(): TaskAssignee[] {
  return mockAssignees
}

// ---------------------------------------------------------------------------
// getTaskAssignees
// ---------------------------------------------------------------------------

export async function getTaskAssignees(taskId: string): Promise<TaskAssignee[]> {
  if (useMock()) {
    // In mock mode, return assignees for this task
    // Also populate user data from mock users
    const { mockUsers } = await import('@/lib/mock/data')
    return getMockAssignees()
      .filter((a) => a.task_id === taskId)
      .map((a) => ({
        ...a,
        user: mockUsers.find((u) => u.id === a.user_id),
      }))
  }

  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()

  const { data, error } = await supabase
    .from('task_assignees')
    .select('*, user:users!task_assignees_user_id_fkey(*)')
    .eq('task_id', taskId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return (data ?? []) as TaskAssignee[]
}

// ---------------------------------------------------------------------------
// addTaskAssignee
// ---------------------------------------------------------------------------

export async function addTaskAssignee(
  taskId: string,
  userId: string
): Promise<TaskAssignee> {
  if (useMock()) {
    const { mockUsers } = await import('@/lib/mock/data')
    const newAssignee: TaskAssignee = {
      id: `mock-assignee-${mockIdCounter++}`,
      task_id: taskId,
      user_id: userId,
      created_at: new Date().toISOString(),
      user: mockUsers.find((u) => u.id === userId),
    }
    mockAssignees.push(newAssignee)
    return newAssignee
  }

  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()

  const { data, error } = await supabase
    .from('task_assignees')
    .insert({ task_id: taskId, user_id: userId })
    .select('*, user:users!task_assignees_user_id_fkey(*)')
    .single()

  if (error) throw error

  // Send email notification to the new assignee (fire-and-forget)
  if (process.env.NEXT_PUBLIC_USE_MOCK !== 'true' && data?.user?.email) {
    const { getTaskById } = await import('@/lib/data/tasks')
    const task = await getTaskById(taskId)

    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (task) {
      const { sendTaskAssignmentEmail } = await import('@/lib/email/task-assignment')
      sendTaskAssignmentEmail({
        taskId,
        taskTitle: task.title,
        clientName: task.client?.name ?? '',
        confirmedDeadline: task.confirmed_deadline ?? null,
        estimatedHours: task.estimated_hours ?? null,
        directorName: task.director?.name ?? '',
        description: task.description ?? null,
        assigneeEmail: data.user.email,
        assigneeName: data.user.name,
        assignerId: authUser?.id ?? '',
        assigneeId: userId,
      }).catch((err: unknown) => {
        console.error('[addTaskAssignee] Email notification failed:', err)
      })
    }
  }

  return data as TaskAssignee
}

// ---------------------------------------------------------------------------
// removeTaskAssignee
// ---------------------------------------------------------------------------

export async function removeTaskAssignee(
  taskId: string,
  userId: string
): Promise<boolean> {
  if (useMock()) {
    const before = mockAssignees.length
    mockAssignees = mockAssignees.filter(
      (a) => !(a.task_id === taskId && a.user_id === userId)
    )
    return mockAssignees.length < before
  }

  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()

  const { error } = await supabase
    .from('task_assignees')
    .delete()
    .eq('task_id', taskId)
    .eq('user_id', userId)

  if (error) throw error
  return true
}
