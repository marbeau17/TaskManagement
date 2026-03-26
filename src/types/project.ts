export type ProjectStatus = 'planning' | 'active' | 'on_hold' | 'completed' | 'archived'

export interface Project {
  id: string
  name: string
  description: string
  status: ProjectStatus
  pm_id: string | null
  key_prefix: string
  next_issue_seq: number
  start_date: string | null
  end_date: string | null
  created_at: string
  updated_at: string
  pm?: import('./database').User
}

export interface ProjectFilters {
  status?: ProjectStatus | 'all'
  pm_id?: string
  search?: string
}
