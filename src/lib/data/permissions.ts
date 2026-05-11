import { isMockMode } from '@/lib/utils'

export interface Permission {
  role: string
  resource: string
  action: string
  allowed: boolean
}

// ---------------------------------------------------------------------------
// Default permissions (used for mock mode and as seed reference)
// ---------------------------------------------------------------------------

const DEFAULT_PERMISSIONS: Permission[] = [
  // Admin: wildcard — can do everything
  { role: 'admin', resource: '*', action: '*', allowed: true },

  // Director: most things allowed
  { role: 'director', resource: 'tasks', action: 'create', allowed: true },
  { role: 'director', resource: 'tasks', action: 'read', allowed: true },
  { role: 'director', resource: 'tasks', action: 'update', allowed: true },
  { role: 'director', resource: 'tasks', action: 'delete', allowed: true },
  { role: 'director', resource: 'issues', action: 'create', allowed: true },
  { role: 'director', resource: 'issues', action: 'read', allowed: true },
  { role: 'director', resource: 'issues', action: 'update', allowed: true },
  { role: 'director', resource: 'projects', action: 'create', allowed: true },
  { role: 'director', resource: 'projects', action: 'read', allowed: true },
  { role: 'director', resource: 'projects', action: 'update', allowed: true },
  { role: 'director', resource: 'members', action: 'read', allowed: true },
  { role: 'director', resource: 'members', action: 'update', allowed: true },
  { role: 'director', resource: 'clients', action: 'create', allowed: true },
  { role: 'director', resource: 'clients', action: 'read', allowed: true },
  { role: 'director', resource: 'clients', action: 'update', allowed: true },
  { role: 'director', resource: 'workload', action: 'read', allowed: true },
  { role: 'director', resource: 'settings', action: 'read', allowed: true },
  { role: 'director', resource: 'settings', action: 'update', allowed: true },

  // Creator: limited to tasks and own work
  { role: 'creator', resource: 'tasks', action: 'read', allowed: true },
  { role: 'creator', resource: 'tasks', action: 'update', allowed: true },
  { role: 'creator', resource: 'issues', action: 'create', allowed: true },
  { role: 'creator', resource: 'issues', action: 'read', allowed: true },
  { role: 'creator', resource: 'projects', action: 'read', allowed: true },
  { role: 'creator', resource: 'members', action: 'read', allowed: true },
  { role: 'creator', resource: 'clients', action: 'read', allowed: true },
  { role: 'creator', resource: 'workload', action: 'read', allowed: true },
  { role: 'creator', resource: 'settings', action: 'read', allowed: true },

  // Requester: can create tasks and view data
  { role: 'requester', resource: 'tasks', action: 'create', allowed: true },
  { role: 'requester', resource: 'tasks', action: 'read', allowed: true },
  { role: 'requester', resource: 'issues', action: 'create', allowed: true },
  { role: 'requester', resource: 'issues', action: 'read', allowed: true },
  { role: 'requester', resource: 'projects', action: 'read', allowed: true },
  { role: 'requester', resource: 'members', action: 'read', allowed: true },
  { role: 'requester', resource: 'clients', action: 'read', allowed: true },
  { role: 'requester', resource: 'workload', action: 'read', allowed: true },
  { role: 'requester', resource: 'settings', action: 'read', allowed: true },

  // Specialist: 課題管理・タスク・プロジェクトの基本 CRUD を許可。
  // DB の permissions テーブルにも同等のエントリを投入済み (上書き先優先)。
  // mock モードやフェッチ失敗時のフォールバックとしてここでも明示しておく。
  { role: 'Specialist', resource: 'tasks', action: 'create', allowed: true },
  { role: 'Specialist', resource: 'tasks', action: 'read', allowed: true },
  { role: 'Specialist', resource: 'tasks', action: 'update', allowed: true },
  { role: 'Specialist', resource: 'issues', action: 'create', allowed: true },
  { role: 'Specialist', resource: 'issues', action: 'read', allowed: true },
  { role: 'Specialist', resource: 'issues', action: 'update', allowed: true },
  { role: 'Specialist', resource: 'projects', action: 'read', allowed: true },
  { role: 'Specialist', resource: 'projects', action: 'update', allowed: true },
  { role: 'Specialist', resource: 'members', action: 'read', allowed: true },
  { role: 'Specialist', resource: 'clients', action: 'read', allowed: true },
  { role: 'Specialist', resource: 'workload', action: 'read', allowed: true },
  { role: 'Specialist', resource: 'settings', action: 'read', allowed: true },
  { role: 'Specialist', resource: 'reports', action: 'read', allowed: true },
  { role: 'Specialist', resource: 'chat', action: 'read', allowed: true },
  { role: 'Specialist', resource: 'chat', action: 'create', allowed: true },
]

// ---------------------------------------------------------------------------
// getPermissions
// ---------------------------------------------------------------------------

export async function getPermissions(): Promise<Permission[]> {
  if (isMockMode()) {
    return DEFAULT_PERMISSIONS
  }

  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()
  const { data, error } = await (supabase as any)
    .from('permissions')
    .select('role, resource, action, allowed')
    .order('role')

  if (error) {
    console.warn('Failed to fetch permissions, using defaults:', error.message)
    return DEFAULT_PERMISSIONS
  }

  return (data ?? DEFAULT_PERMISSIONS) as Permission[]
}

// ---------------------------------------------------------------------------
// checkPermission
// ---------------------------------------------------------------------------

export async function checkPermission(
  role: string,
  resource: string,
  action: string
): Promise<boolean> {
  const permissions = await getPermissions()

  return permissions.some(
    (p) =>
      p.role === role &&
      p.allowed &&
      (p.resource === '*' || p.resource === resource) &&
      (p.action === '*' || p.action === action)
  )
}
