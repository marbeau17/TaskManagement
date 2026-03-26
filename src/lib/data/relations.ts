// =============================================================================
// Data abstraction layer – Issue Relations & Task Dependencies
// =============================================================================

import type { IssueRelation, TaskDependency, RelationType } from '@/types/relation'
import { useMock } from '@/lib/utils'

// ---------------------------------------------------------------------------
// getIssueRelations
// ---------------------------------------------------------------------------

export async function getIssueRelations(issueId: string): Promise<IssueRelation[]> {
  if (useMock()) {
    return []
  }

  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('issue_relations')
    .select(`
      *,
      source_issue:issues!source_issue_id(id, issue_key, title, status),
      target_issue:issues!target_issue_id(id, issue_key, title, status)
    `)
    .or(`source_issue_id.eq.${issueId},target_issue_id.eq.${issueId}`)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as IssueRelation[]
}

// ---------------------------------------------------------------------------
// addIssueRelation
// ---------------------------------------------------------------------------

export async function addIssueRelation(
  sourceId: string,
  targetId: string,
  type: RelationType
): Promise<IssueRelation> {
  if (useMock()) {
    return {
      id: crypto.randomUUID(),
      source_issue_id: sourceId,
      target_issue_id: targetId,
      relation_type: type,
      created_by: null,
      created_at: new Date().toISOString(),
    }
  }

  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userId = (await (supabase as any).auth.getUser()).data.user?.id ?? null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('issue_relations')
    .insert({
      source_issue_id: sourceId,
      target_issue_id: targetId,
      relation_type: type,
      created_by: userId,
    })
    .select(`
      *,
      source_issue:issues!source_issue_id(id, issue_key, title, status),
      target_issue:issues!target_issue_id(id, issue_key, title, status)
    `)
    .single()

  if (error) throw error
  return data as IssueRelation
}

// ---------------------------------------------------------------------------
// removeIssueRelation
// ---------------------------------------------------------------------------

export async function removeIssueRelation(id: string): Promise<void> {
  if (useMock()) {
    return
  }

  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('issue_relations')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// ---------------------------------------------------------------------------
// getTaskDependencies
// ---------------------------------------------------------------------------

export async function getTaskDependencies(taskId: string): Promise<TaskDependency[]> {
  if (useMock()) {
    return []
  }

  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('task_dependencies')
    .select(`
      *,
      source_task:tasks!source_task_id(id, title, status),
      target_task:tasks!target_task_id(id, title, status)
    `)
    .or(`source_task_id.eq.${taskId},target_task_id.eq.${taskId}`)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as TaskDependency[]
}

// ---------------------------------------------------------------------------
// addTaskDependency
// ---------------------------------------------------------------------------

export async function addTaskDependency(
  sourceId: string,
  targetId: string,
  type: RelationType
): Promise<TaskDependency> {
  if (useMock()) {
    return {
      id: crypto.randomUUID(),
      source_task_id: sourceId,
      target_task_id: targetId,
      relation_type: type,
      created_at: new Date().toISOString(),
    }
  }

  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('task_dependencies')
    .insert({
      source_task_id: sourceId,
      target_task_id: targetId,
      relation_type: type,
    })
    .select(`
      *,
      source_task:tasks!source_task_id(id, title, status),
      target_task:tasks!target_task_id(id, title, status)
    `)
    .single()

  if (error) throw error
  return data as TaskDependency
}

// ---------------------------------------------------------------------------
// removeTaskDependency
// ---------------------------------------------------------------------------

export async function removeTaskDependency(id: string): Promise<void> {
  if (useMock()) {
    return
  }

  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('task_dependencies')
    .delete()
    .eq('id', id)

  if (error) throw error
}
