// =============================================================================
// Data abstraction layer – Workflow Settings (REQ-08)
// =============================================================================

import type { WorkflowSettings, WorkflowStatusDef } from '@/types/project'

// ---------------------------------------------------------------------------
// Default statuses
// ---------------------------------------------------------------------------

export function getDefaultStatuses(): WorkflowStatusDef[] {
  return [
    { key: 'waiting', label: 'アサイン待ち', color: '#94a3b8' },
    { key: 'todo', label: '未着手', color: '#60a5fa' },
    { key: 'in_progress', label: '進行中', color: '#f59e0b' },
    { key: 'done', label: '完了', color: '#34d399' },
  ]
}

// ---------------------------------------------------------------------------
// getWorkflowSettings
// ---------------------------------------------------------------------------

export async function getWorkflowSettings(
  projectId: string
): Promise<WorkflowSettings | null> {
  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('workflow_settings')
    .select('*')
    .eq('project_id', projectId)
    .single()

  if (error) {
    // PGRST116 = row not found — return null so caller can use defaults
    if (error.code === 'PGRST116') return null
    throw error
  }

  return data as WorkflowSettings
}

// ---------------------------------------------------------------------------
// updateWorkflowSettings (upsert)
// ---------------------------------------------------------------------------

export async function updateWorkflowSettings(
  projectId: string,
  settings: {
    statuses: WorkflowStatusDef[]
    transitions?: WorkflowSettings['transitions']
  }
): Promise<WorkflowSettings> {
  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()

  const payload = {
    project_id: projectId,
    statuses: settings.statuses,
    transitions: settings.transitions ?? null,
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('workflow_settings')
    .upsert(payload, { onConflict: 'project_id' })
    .select('*')
    .single()

  if (error) { console.warn("[Data]", error.message); return undefined as any }
  return data as WorkflowSettings
}
