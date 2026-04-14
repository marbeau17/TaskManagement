import { NextRequest, NextResponse } from 'next/server'
import { isMockMode } from '@/lib/utils'
import type { Client } from '@/types/database'

// ---------------------------------------------------------------------------
// Import interfaces
// ---------------------------------------------------------------------------

interface ImportClient {
  name: string
}

interface ImportTask {
  title: string
  description: string
  status: 'waiting' | 'todo' | 'in_progress' | 'reviewing' | 'done' | 'rejected'
  client_name: string
  project_name: string
  assigned_to_email: string
  additional_assignee_emails: string[]
  desired_deadline: string | null
  confirmed_deadline: string | null
  estimated_hours: number | null
  reference_url: string
  updated_at: string
  function_category: string
  task_type: string
  priority: string
}

interface ImportResult {
  success_count: number
  error_count: number
  errors: { index: number; title: string; message: string }[]
  created_task_ids: string[]
}

// ---------------------------------------------------------------------------
// POST /api/import/tasks
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    let importTasks: ImportTask[]
    let importClients: ImportClient[]

    if (body.rows && Array.isArray(body.rows)) {
      // Format from import UI: { rows: Record<string,string>[], mappings: [] }
      importTasks = body.rows.map((row: Record<string, string>) => ({
        title: row.title || '',
        description: row.description || '',
        status: (row.status || 'waiting') as ImportTask['status'],
        client_name: row.client_name || '',
        project_name: row.project_name || '',
        assigned_to_email: row.assignee || '',
        additional_assignee_emails: [],
        desired_deadline: row.deadline || null,
        confirmed_deadline: null,
        estimated_hours: row.estimated_hours ? parseFloat(row.estimated_hours) : null,
        reference_url: '',
        updated_at: '',
        function_category: row.category || '',
        task_type: '',
        priority: row.priority || '3',
      }))
      // Extract unique client names
      importClients = [...new Set(importTasks.map(t => t.client_name).filter(Boolean))].map(name => ({ name }))
    } else {
      // Legacy format: { tasks: ImportTask[], clients: ImportClient[] }
      importTasks = body.tasks ?? []
      importClients = body.clients ?? []
    }

    if (!Array.isArray(importTasks)) {
      return NextResponse.json({ error: 'tasks must be an array' }, { status: 400 })
    }

    if (isMockMode()) {
      return NextResponse.json(await handleMockImport(importTasks, importClients))
    }
    return NextResponse.json(await handleSupabaseImport(importTasks, importClients))
  } catch (error) {
    console.error('[import/tasks] Unexpected error:', error)
    return NextResponse.json({ error: 'Import failed', detail: String(error) }, { status: 500 })
  }
}

// ---------------------------------------------------------------------------
// Mock mode handler
// ---------------------------------------------------------------------------

async function handleMockImport(
  importTasks: ImportTask[],
  importClients: ImportClient[]
): Promise<ImportResult> {
  const { mockUsers } = await import('@/lib/mock/data')
  const handlers = await import('@/lib/mock/handlers')

  const result: ImportResult = {
    success_count: 0,
    error_count: 0,
    errors: [],
    created_task_ids: [],
  }

  // 1. Upsert clients
  const clientMap = new Map<string, Client>()
  const existingClients = handlers.getMockClients()
  for (const c of existingClients) {
    clientMap.set(c.name, c)
  }
  for (const ic of importClients) {
    if (!clientMap.has(ic.name)) {
      const created = handlers.createMockClient(ic.name)
      clientMap.set(created.name, created)
    }
  }

  // 2. Create tasks
  for (let i = 0; i < importTasks.length; i++) {
    const it = importTasks[i]
    try {
      // Ensure client exists
      if (!clientMap.has(it.client_name)) {
        const created = handlers.createMockClient(it.client_name)
        clientMap.set(created.name, created)
      }

      // Resolve primary assignee by email
      const primaryUser = it.assigned_to_email
        ? mockUsers.find((u) => u.email === it.assigned_to_email) ?? null
        : null

      // Create the task via the mock handler
      const task = handlers.createMockTask(
        {
          client_name: it.client_name,
          title: it.title,
          description: it.description,
          desired_deadline: it.desired_deadline ?? '',
          reference_url: it.reference_url ?? '',
        },
        primaryUser
          ? {
              assigned_to: primaryUser.id,
              confirmed_deadline: it.confirmed_deadline ?? '',
              estimated_hours: it.estimated_hours ?? 0,
            }
          : undefined
      )

      // Override status if the task was created with step2 (defaults to 'todo')
      // Use updateMockTask to set the correct status
      if (it.status !== 'waiting' && it.status !== 'todo') {
        handlers.updateMockTask(task.id, { status: it.status })
      }

      // Handle additional assignees
      if (it.additional_assignee_emails?.length > 0) {
        const { addTaskAssignee } = await import('@/lib/data/task-assignees')
        for (const email of it.additional_assignee_emails) {
          const user = mockUsers.find((u) => u.email === email)
          if (user) {
            await addTaskAssignee(task.id, user.id)
          }
        }
      }

      result.success_count++
      result.created_task_ids.push(task.id)
    } catch (err) {
      result.error_count++
      result.errors.push({
        index: i,
        title: it.title,
        message: String(err),
      })
    }
  }

  return result
}

// ---------------------------------------------------------------------------
// Supabase mode handler
// ---------------------------------------------------------------------------

async function handleSupabaseImport(
  importTasks: ImportTask[],
  importClients: ImportClient[]
): Promise<ImportResult> {
  const { createServerSupabaseClient } = await import('@/lib/supabase/server')
  const supabase = await createServerSupabaseClient()

  const result: ImportResult = {
    success_count: 0,
    error_count: 0,
    errors: [],
    created_task_ids: [],
  }

  // Get current user for requested_by
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()
  if (!authUser) {
    return {
      ...result,
      error_count: 1,
      errors: [{ index: -1, title: '', message: 'Not authenticated' }],
    }
  }

  // ---------------------------------------------------------------------------
  // 1. Upsert clients – build a name -> id map
  // ---------------------------------------------------------------------------

  const clientMap = new Map<string, string>()

  // Load all existing clients
  const { data: existingClients } = await supabase
    .from('clients')
    .select('id, name')
  for (const c of existingClients ?? []) {
    clientMap.set(c.name, c.id)
  }

  // Collect unique client names from importClients and importTasks
  const allClientNames = new Set<string>()
  for (const ic of importClients) {
    allClientNames.add(ic.name)
  }
  for (const it of importTasks) {
    if (it.client_name) {
      allClientNames.add(it.client_name)
    }
  }

  // Create missing clients
  for (const name of allClientNames) {
    if (!clientMap.has(name)) {
      const { data: newClient, error } = await supabase
        .from('clients')
        .insert({ name })
        .select('id')
        .single()
      if (error) {
        console.error(`[import/tasks] Failed to create client "${name}":`, error)
        continue
      }
      clientMap.set(name, newClient.id)
    }
  }

  // ---------------------------------------------------------------------------
  // 1b. Resolve project names -> project IDs
  // ---------------------------------------------------------------------------

  const projectMap = new Map<string, string>()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existingProjects } = await (supabase as any)
    .from('projects')
    .select('id, name')
  for (const p of existingProjects ?? []) {
    projectMap.set(p.name, p.id)
  }

  // ---------------------------------------------------------------------------
  // 2. Build user email -> id map for assignee resolution
  // ---------------------------------------------------------------------------

  const allEmails = new Set<string>()
  for (const it of importTasks) {
    if (it.assigned_to_email) allEmails.add(it.assigned_to_email)
    if (it.additional_assignee_emails) {
      for (const e of it.additional_assignee_emails) {
        allEmails.add(e)
      }
    }
  }

  const userMap = new Map<string, string>()
  if (allEmails.size > 0) {
    const { data: users } = await supabase
      .from('users')
      .select('id, email')
      .in('email', [...allEmails])
    for (const u of users ?? []) {
      if (u.email) userMap.set(u.email, u.id)
    }
  }

  // ---------------------------------------------------------------------------
  // 3. Create tasks one by one
  // ---------------------------------------------------------------------------

  for (let i = 0; i < importTasks.length; i++) {
    const it = importTasks[i]
    try {
      const clientId = clientMap.get(it.client_name)
      if (!clientId) {
        throw new Error(`Client not found: ${it.client_name}`)
      }

      const assignedTo = it.assigned_to_email
        ? userMap.get(it.assigned_to_email) ?? null
        : null

      const hasAssignment = !!assignedTo

      const insertPayload = {
        client_id: clientId,
        title: it.title,
        description: it.description || null,
        status: it.status,
        progress: 0,
        requested_by: authUser.id,
        assigned_to: assignedTo,
        director_id: hasAssignment ? authUser.id : null,
        desired_deadline: it.desired_deadline || null,
        confirmed_deadline: it.confirmed_deadline || null,
        estimated_hours: it.estimated_hours ?? null,
        actual_hours: 0,
        reference_url: it.reference_url || null,
        is_draft: false,
        parent_task_id: null,
        wbs_code: '',
        project_id: it.project_name ? (projectMap.get(it.project_name) ?? null) : null,
      }

      const { data: newTask, error } = await supabase
        .from('tasks')
        .insert(insertPayload)
        .select('id')
        .single()

      if (error) throw error

      // Handle additional assignees via task_assignees table
      if (it.additional_assignee_emails?.length > 0) {
        const assigneeRows = it.additional_assignee_emails
          .map((email) => {
            const userId = userMap.get(email)
            if (!userId) return null
            return { task_id: newTask.id, user_id: userId }
          })
          .filter(Boolean) as { task_id: string; user_id: string }[]

        if (assigneeRows.length > 0) {
          const { error: assigneeError } = await supabase
            .from('task_assignees')
            .insert(assigneeRows)
          if (assigneeError) {
            console.error(
              `[import/tasks] Failed to insert assignees for task "${it.title}":`,
              assigneeError
            )
          }
        }
      }

      result.success_count++
      result.created_task_ids.push(newTask.id)
    } catch (err) {
      result.error_count++
      result.errors.push({
        index: i,
        title: it.title,
        message: String(err),
      })
    }
  }

  return result
}
