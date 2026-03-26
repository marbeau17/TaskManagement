// =============================================================================
// Database type definitions matching Supabase schema
// =============================================================================

/** Built-in roles. Custom roles are also allowed as free-text strings. */
export type BuiltinRole = 'admin' | 'director' | 'requester' | 'creator'

/**
 * UserRole accepts both built-in roles and arbitrary custom role strings.
 * The intersection with `(string & {})` lets TypeScript provide autocomplete
 * for the known literals while still accepting any string at runtime.
 */
export type UserRole = BuiltinRole | (string & {})

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
  must_change_password: boolean
  manager_id: string | null
  level: string
  department: string
  title: string
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
  project_id: string | null
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
  template_id: string | null
  template_data: Record<string, any> | null
  parent_task_id: string | null
  wbs_code: string
  start_date: string | null
  created_at: string
  updated_at: string
}

// ---------------------------------------------------------------------------
// Relations (joined queries)
// ---------------------------------------------------------------------------

export interface TaskAssignee {
  id: string
  task_id: string
  user_id: string
  created_at: string
  user?: User
}

export interface TaskWatcher {
  id: string
  task_id: string
  user_id: string
  created_at: string
  user?: User
}

export type NotificationType =
  | 'task_assigned'
  | 'task_status_changed'
  | 'comment_added'
  | 'deadline_changed'
  | 'mention'
  | 'info'

export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  message: string
  link: string | null
  is_read: boolean
  created_at: string
}

export interface TimeLog {
  id: string
  task_id: string
  user_id: string
  hours: number
  description: string
  logged_date: string
  created_at: string
  user?: User
}

export interface TimeLogSummary {
  user_id: string
  user_name: string
  total_hours: number
}

export type CustomFieldType = 'text' | 'number' | 'select' | 'date' | 'checkbox'

export interface CustomFieldDefinition {
  id: string
  project_id: string
  name: string
  field_type: CustomFieldType
  options: string[]
  required: boolean
  sort_order: number
  created_at: string
}

export interface CustomFieldValue {
  id: string
  entity_type: 'issue' | 'task'
  entity_id: string
  field_id: string
  value: unknown
  created_at: string
  definition?: CustomFieldDefinition
}

export interface CreateCustomFieldDefinition {
  project_id: string
  name: string
  field_type: CustomFieldType
  options?: string[]
  required?: boolean
  sort_order?: number
}

export interface UpdateCustomFieldDefinition {
  name?: string
  field_type?: CustomFieldType
  options?: string[]
  required?: boolean
  sort_order?: number
}

export interface TaskWithRelations extends Task {
  client: Client
  assigned_user: User | null
  requester: User
  director: User | null
  assignees?: TaskAssignee[]
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

export interface ProjectMember {
  id: string
  project_name: string
  pm_id: string
  member_id: string
  allocated_hours: number
  created_at: string
  pm?: User
  member?: User
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

// ---------------------------------------------------------------------------
// Re-exports from domain-specific type files
// ---------------------------------------------------------------------------

export type { Project, ProjectStatus, ProjectFilters } from './project'
export type {
  Issue,
  IssueType,
  IssueSeverity,
  IssueStatus,
  IssueComment,
  IssueFilters,
  CreateIssueData,
} from './issue'
