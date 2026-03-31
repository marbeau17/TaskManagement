export type ProjectStatus = 'planning' | 'active' | 'on_hold' | 'completed' | 'archived'

export interface Project {
  id: string
  name: string
  description: string
  status: ProjectStatus
  pm_id: string | null
  client_id: string | null
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

// ---------------------------------------------------------------------------
// Milestones
// ---------------------------------------------------------------------------

export type MilestoneStatus = 'pending' | 'in_progress' | 'completed' | 'overdue'

export interface Milestone {
  id: string
  project_id: string
  title: string
  description: string
  due_date: string | null
  status: MilestoneStatus
  created_at: string
  updated_at: string
}

export interface CreateMilestoneData {
  project_id: string
  title: string
  description?: string
  due_date?: string
  status?: MilestoneStatus
}

export interface UpdateMilestoneData {
  title?: string
  description?: string
  due_date?: string | null
  status?: MilestoneStatus
}

// Workflow settings (REQ-08)
export interface WorkflowStatusDef {
  key: string
  label: string
  color: string
}

export interface WorkflowTransition {
  from: string
  to: string
}

export interface WorkflowSettings {
  statuses: WorkflowStatusDef[]
  transitions: WorkflowTransition[] | null
}

// Project Templates (REQ-01)
export interface ProjectTemplateMilestone {
  name: string
  offset_days: number
}

export interface ProjectTemplateTask {
  title: string
  status: string
}

export interface ProjectTemplate {
  id: string
  name: string
  description: string | null
  default_statuses: string[]
  default_milestones: ProjectTemplateMilestone[]
  default_tasks: ProjectTemplateTask[]
  created_by: string | null
  created_at: string
}

export interface ProjectTemplateCreateInput {
  name: string
  description: string
  default_statuses?: string[]
  default_milestones?: ProjectTemplateMilestone[]
  default_tasks?: ProjectTemplateTask[]
}
