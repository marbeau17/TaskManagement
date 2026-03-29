// =============================================================================
// Data abstraction layer – Task Watchers (follow / unfollow tasks)
// Switches between mock handlers and Supabase depending on Supabase URL config
// =============================================================================

import type { TaskWatcher } from '@/types/database'
import { useMock } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Mock in-memory store
// ---------------------------------------------------------------------------

let mockWatchers: TaskWatcher[] = []
let mockIdCounter = 1

// ---------------------------------------------------------------------------
// getWatchers — returns list of users watching a task
// ---------------------------------------------------------------------------

export async function getWatchers(taskId: string): Promise<TaskWatcher[]> {
  if (useMock()) {
    const { mockUsers } = await import('@/lib/mock/data')
    return mockWatchers
      .filter((w) => w.task_id === taskId)
      .map((w) => ({
        ...w,
        user: mockUsers.find((u) => u.id === w.user_id),
      }))
  }

  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()

  const { data, error } = await supabase
    .from('task_watchers')
    .select('*, user:users!task_watchers_user_id_fkey(*)')
    .eq('task_id', taskId)
    .order('created_at', { ascending: true })

  if (error) { console.warn("[Data]", error.message); return undefined as any }
  return (data ?? []) as TaskWatcher[]
}

// ---------------------------------------------------------------------------
// addWatcher — start watching a task
// ---------------------------------------------------------------------------

export async function addWatcher(
  taskId: string,
  userId: string,
): Promise<TaskWatcher> {
  if (useMock()) {
    const { mockUsers } = await import('@/lib/mock/data')
    // Prevent duplicates in mock mode
    const existing = mockWatchers.find(
      (w) => w.task_id === taskId && w.user_id === userId,
    )
    if (existing) return { ...existing, user: mockUsers.find((u) => u.id === userId) }

    const newWatcher: TaskWatcher = {
      id: `mock-watcher-${mockIdCounter++}`,
      task_id: taskId,
      user_id: userId,
      created_at: new Date().toISOString(),
      user: mockUsers.find((u) => u.id === userId),
    }
    mockWatchers.push(newWatcher)
    return newWatcher
  }

  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()

  const { data, error } = await supabase
    .from('task_watchers')
    .insert({ task_id: taskId, user_id: userId })
    .select('*, user:users!task_watchers_user_id_fkey(*)')
    .single()

  if (error) { console.warn("[Data]", error.message); return undefined as any }
  return data as TaskWatcher
}

// ---------------------------------------------------------------------------
// removeWatcher — stop watching a task
// ---------------------------------------------------------------------------

export async function removeWatcher(
  taskId: string,
  userId: string,
): Promise<boolean> {
  if (useMock()) {
    const before = mockWatchers.length
    mockWatchers = mockWatchers.filter(
      (w) => !(w.task_id === taskId && w.user_id === userId),
    )
    return mockWatchers.length < before
  }

  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()

  const { error } = await supabase
    .from('task_watchers')
    .delete()
    .eq('task_id', taskId)
    .eq('user_id', userId)

  if (error) { console.warn("[Data]", error.message); return undefined as any }
  return true
}

// ---------------------------------------------------------------------------
// isWatching — check if a specific user watches a task
// ---------------------------------------------------------------------------

export async function isWatching(
  taskId: string,
  userId: string,
): Promise<boolean> {
  if (useMock()) {
    return mockWatchers.some(
      (w) => w.task_id === taskId && w.user_id === userId,
    )
  }

  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()

  const { data, error } = await supabase
    .from('task_watchers')
    .select('id')
    .eq('task_id', taskId)
    .eq('user_id', userId)
    .maybeSingle()

  if (error) { console.warn("[Data]", error.message); return undefined as any }
  return !!data
}
