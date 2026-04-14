// =============================================================================
// Task-specific filter and form types
// =============================================================================

import { TaskStatus } from './database'

/** Filters applied to the task list view */
export interface TaskFilters {
  search?: string
  client_id?: string
  project_id?: string
  assigned_to?: string
  requested_by?: string
  status?: TaskStatus | 'all'
  period?: 'week' | 'month' | 'all'
  parent_task_id?: string | null
}

/** Step 1 of task creation: requester fills in basic info */
export interface TaskFormStep1 {
  client_name: string
  title: string
  description?: string
  desired_deadline?: string
  reference_url?: string
  priority?: number
  template_id?: string
  template_data?: Record<string, any>
  project_id?: string
  parent_task_id?: string
  wbs_code?: string
}

/** Step 2 of task creation: director assigns and confirms */
export interface TaskFormStep2 {
  assigned_to: string
  confirmed_deadline: string
  estimated_hours?: number | null
}

/** Pagination parameters for list queries */
export interface PaginationParams {
  page: number
  pageSize: number
}

/** Paginated result wrapper */
export interface PaginatedResult<T> {
  data: T[]
  totalCount: number
}

/** Payload for updating task progress */
export interface TaskProgressUpdate {
  progress: number
  status: TaskStatus
  actual_hours: number
}
