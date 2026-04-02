// =============================================================================
// Data abstraction layer – Issues
// =============================================================================

import type { Issue, IssueStatus, IssueComment, IssueFilters, CreateIssueData } from '@/types/issue'
import { isMockMode } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Valid workflow transitions
// ---------------------------------------------------------------------------

const VALID_TRANSITIONS: Record<IssueStatus, IssueStatus[]> = {
  open: ['in_progress', 'not_a_bug', 'duplicate', 'deferred', 'closed'],
  in_progress: ['resolved', 'not_a_bug', 'deferred', 'open', 'closed'],
  resolved: ['verified', 'open'],
  verified: ['closed', 'open'],
  closed: ['open'],
  not_a_bug: ['open'],
  duplicate: ['open'],
  deferred: ['open', 'in_progress'],
}

export function isValidTransition(from: IssueStatus, to: IssueStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false
}

// ---------------------------------------------------------------------------
// getIssues
// ---------------------------------------------------------------------------

export async function getIssues(filters?: IssueFilters): Promise<Issue[]> {
  if (isMockMode()) {
    const { getMockIssues } = await import('@/lib/mock/handlers')
    return getMockIssues(filters)
  }

  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from('issues')
    .select(`
      *,
      reporter:users!reported_by(*),
      assignee:users!assigned_to(*),
      project:projects!project_id(*),
      task:tasks!task_id(id, title)
    `)
    .order('created_at', { ascending: false })

  if (filters?.project_id) {
    query = query.eq('project_id', filters.project_id)
  }
  if (filters?.type && filters.type !== 'all') {
    query = query.eq('type', filters.type)
  }
  if (filters?.severity && filters.severity !== 'all') {
    query = query.eq('severity', filters.severity)
  }
  if (filters?.status && filters.status !== 'all') {
    query = query.eq('status', filters.status)
  }
  if (filters?.assigned_to) {
    query = query.eq('assigned_to', filters.assigned_to)
  }
  if (filters?.source) {
    query = query.eq('source', filters.source)
  }
  if (filters?.search) {
    query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
  }

  const { data, error } = await query

  if (error) throw error
  return (data ?? []) as Issue[]
}

// ---------------------------------------------------------------------------
// getIssueById
// ---------------------------------------------------------------------------

export async function getIssueById(id: string): Promise<Issue | null> {
  if (isMockMode()) {
    const { getMockIssueById } = await import('@/lib/mock/handlers')
    return getMockIssueById(id)
  }

  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('issues')
    .select(`
      *,
      reporter:users!reported_by(*),
      assignee:users!assigned_to(*),
      project:projects!project_id(*),
      task:tasks!task_id(*)
    `)
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }
  return data as Issue
}

// ---------------------------------------------------------------------------
// createIssue — auto-generates issue_key from project prefix + seq
// ---------------------------------------------------------------------------

export async function createIssue(data: CreateIssueData): Promise<Issue> {
  if (isMockMode()) {
    const { createMockIssue } = await import('@/lib/mock/handlers')
    return createMockIssue(data)
  }

  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()

  // 1. Atomically fetch and increment next_issue_seq using conditional update
  //    This avoids race conditions where two concurrent requests get the same seq.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: project, error: projError } = await (supabase as any)
    .from('projects')
    .select('key_prefix, next_issue_seq')
    .eq('id', data.project_id)
    .single()

  if (projError) throw projError

  const issueKey = `${project.key_prefix}-${project.next_issue_seq}`

  // 2. Atomically increment next_issue_seq with optimistic lock (match current value)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateError } = await (supabase as any)
    .from('projects')
    .update({ next_issue_seq: project.next_issue_seq + 1 })
    .eq('id', data.project_id)
    .eq('next_issue_seq', project.next_issue_seq)

  if (updateError) throw updateError

  // 3. Insert the issue
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: result, error } = await (supabase as any)
    .from('issues')
    .insert({
      project_id: data.project_id,
      issue_key: issueKey,
      type: data.type,
      severity: data.severity,
      priority: 3,
      status: 'open',
      title: data.title,
      description: data.description ?? '',
      reproduction_steps: data.reproduction_steps ?? '',
      expected_result: data.expected_result ?? '',
      actual_result: data.actual_result ?? '',
      environment: data.environment ?? {},
      source: data.source ?? 'internal',
      reported_by: (await (supabase as any).auth.getUser()).data.user?.id,
      assigned_to: data.assigned_to ?? null,
      task_id: data.task_id ?? null,
      resolution_notes: '',
      git_branch: '',
      git_pr_url: '',
      labels: data.labels ?? [],
      reopen_count: 0,
    })
    .select(`
      *,
      reporter:users!reported_by(*),
      assignee:users!assigned_to(*),
      project:projects!project_id(*)
    `)
    .single()

  if (error) throw error
  return result as Issue
}

// ---------------------------------------------------------------------------
// updateIssue
// ---------------------------------------------------------------------------

export async function updateIssue(
  id: string,
  data: Partial<Omit<Issue, 'id' | 'created_at' | 'updated_at' | 'reporter' | 'assignee' | 'project' | 'task'>>
): Promise<Issue> {
  if (isMockMode()) {
    const { updateMockIssue } = await import('@/lib/mock/handlers')
    return updateMockIssue(id, data)
  }

  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: result, error } = await (supabase as any)
    .from('issues')
    .update(data)
    .eq('id', id)
    .select(`
      *,
      reporter:users!reported_by(*),
      assignee:users!assigned_to(*),
      project:projects!project_id(*)
    `)
    .single()

  if (error) throw error
  return result as Issue
}

// ---------------------------------------------------------------------------
// transitionIssueStatus — validates workflow transitions
// ---------------------------------------------------------------------------

export async function transitionIssueStatus(
  id: string,
  newStatus: IssueStatus
): Promise<Issue> {
  if (isMockMode()) {
    const { transitionMockIssueStatus } = await import('@/lib/mock/handlers')
    return transitionMockIssueStatus(id, newStatus)
  }

  // First fetch current status
  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: current, error: fetchError } = await (supabase as any)
    .from('issues')
    .select('status')
    .eq('id', id)
    .single()

  if (fetchError) throw fetchError

  const currentStatus = current.status as IssueStatus
  if (!isValidTransition(currentStatus, newStatus)) {
    throw new Error(
      `Invalid status transition: ${currentStatus} -> ${newStatus}`
    )
  }

  const updateData: Record<string, unknown> = { status: newStatus }

  // Track reopens
  if (newStatus === 'open' && currentStatus !== 'open') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: issue } = await (supabase as any)
      .from('issues')
      .select('reopen_count')
      .eq('id', id)
      .single()
    updateData.reopen_count = (issue?.reopen_count ?? 0) + 1
  }

  return updateIssue(id, updateData as Partial<Issue>)
}

// ---------------------------------------------------------------------------
// deleteIssue
// ---------------------------------------------------------------------------

export async function deleteIssue(id: string): Promise<void> {
  if (isMockMode()) {
    const { deleteMockIssue } = await import('@/lib/mock/handlers')
    deleteMockIssue(id)
    return
  }

  // Use server-side API route to bypass RLS restrictions
  const res = await fetch('/api/issues/delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ issueId: id }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    console.warn('[Issues] Delete failed:', data.error)
  }
}

// ---------------------------------------------------------------------------
// getIssueComments
// ---------------------------------------------------------------------------

export async function getIssueComments(issueId: string): Promise<IssueComment[]> {
  if (isMockMode()) {
    const { getMockIssueComments } = await import('@/lib/mock/handlers')
    return getMockIssueComments(issueId)
  }

  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('issue_comments')
    .select('*, user:users!user_id(*)')
    .eq('issue_id', issueId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return (data ?? []) as IssueComment[]
}

// ---------------------------------------------------------------------------
// addIssueComment
// ---------------------------------------------------------------------------

export async function addIssueComment(
  issueId: string,
  body: string
): Promise<IssueComment> {
  if (isMockMode()) {
    const { addMockIssueComment } = await import('@/lib/mock/handlers')
    return addMockIssueComment(issueId, body)
  }

  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userId = (await (supabase as any).auth.getUser()).data.user?.id

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('issue_comments')
    .insert({
      issue_id: issueId,
      user_id: userId,
      body,
    })
    .select('*, user:users!user_id(*)')
    .single()

  if (error) throw error
  return data as IssueComment
}
