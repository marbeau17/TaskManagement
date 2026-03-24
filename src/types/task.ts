// =============================================================================
// Task-specific filter and form types
// =============================================================================

import { TaskStatus } from './database'

/** Filters applied to the task list view */
export interface TaskFilters {
  search?: string
  client_id?: string
  assigned_to?: string
  requested_by?: string
  status?: TaskStatus | 'all'
  period?: 'week' | 'month' | 'all'
}

/** Step 1 of task creation: requester fills in basic info */
export interface TaskFormStep1 {
  client_name: string
  title: string
  description?: string
  desired_deadline?: string
  reference_url?: string
}

/** Step 2 of task creation: director assigns and confirms */
export interface TaskFormStep2 {
  assigned_to: string
  confirmed_deadline: string
  estimated_hours: number
}

/** Payload for updating task progress */
export interface TaskProgressUpdate {
  progress: number
  status: TaskStatus
  actual_hours: number
}
