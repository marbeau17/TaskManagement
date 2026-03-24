// =============================================================================
// Database type definitions matching Supabase schema
// =============================================================================

export type UserRole = 'admin' | 'director' | 'requester' | 'creator'

export type TaskStatus = 'waiting' | 'todo' | 'in_progress' | 'done' | 'rejected'

export type AvatarColor = 'av-a' | 'av-b' | 'av-c' | 'av-d' | 'av-e'

export type ActivityAction =
  | 'created'
  | 'assigned'
  | 'progress_updated'
  | 'status_changed'
  | 'hours_updated'
  | 'comment_added'
  | 'deadline_changed'
  | 'rejected'

// ---------------------------------------------------------------------------
// Core tables
// ---------------------------------------------------------------------------

export interface User {
  id: string
  email: string
  name: string
  name_short: string
  role: UserRole
  avatar_color: AvatarColor
  weekly_capacity_hours: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Client {
  id: string
  name: string
  created_at: string
}

export interface Task {
  id: string
  client_id: string
  title: string
  description: string | null
  status: TaskStatus
  progress: number
  requested_by: string
  assigned_to: string | null
  director_id: string | null
  desired_deadline: string | null
  confirmed_deadline: string | null
  estimated_hours: number | null
  actual_hours: number
  reference_url: string | null
  is_draft: boolean
  created_at: string
  updated_at: string
}

// ---------------------------------------------------------------------------
// Relations (joined queries)
// ---------------------------------------------------------------------------

export interface TaskWithRelations extends Task {
  client: Client
  assigned_user: User | null
  requester: User
  director: User | null
}

// ---------------------------------------------------------------------------
// Supporting tables
// ---------------------------------------------------------------------------

export interface Comment {
  id: string
  task_id: string
  user_id: string
  body: string
  created_at: string
  user?: User
}

export interface Attachment {
  id: string
  task_id: string
  uploaded_by: string
  file_name: string
  file_size: number
  storage_path: string
  mime_type: string
  created_at: string
  uploader?: User
}

export interface ActivityLog {
  id: string
  task_id: string
  user_id: string
  action: ActivityAction
  detail: Record<string, unknown> | null
  created_at: string
  user?: User
}
