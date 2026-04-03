import type { Project } from './project'

export type IssueType = 'bug' | 'improvement' | 'question' | 'incident'
export type IssueSeverity = 'critical' | 'high' | 'medium' | 'low'
export type IssueStatus = 'open' | 'in_progress' | 'resolved' | 'verified' | 'closed' | 'not_a_bug' | 'duplicate' | 'deferred'

export interface Issue {
  id: string
  project_id: string
  issue_key: string
  type: IssueType
  severity: IssueSeverity
  priority: number
  status: IssueStatus
  title: string
  description: string
  reproduction_steps: string
  expected_result: string
  actual_result: string
  environment: Record<string, string>
  source: 'internal' | 'customer'
  reported_by: string
  assigned_to: string | null
  task_id: string | null
  resolution_notes: string
  git_branch: string
  git_pr_url: string
  labels: string[]
  reopen_count: number
  resolved_at?: string | null
  closed_at?: string | null
  created_at: string
  updated_at: string
  // Joined
  reporter?: import('./database').User
  assignee?: import('./database').User
  project?: Project
  task?: import('./database').Task
}

export interface IssueComment {
  id: string
  issue_id: string
  user_id: string
  body: string
  created_at: string
  user?: import('./database').User
}

export interface IssueFilters {
  project_id?: string
  type?: IssueType | 'all'
  severity?: IssueSeverity | 'all'
  status?: IssueStatus | 'all'
  assigned_to?: string
  source?: string
  search?: string
}

export interface CreateIssueData {
  project_id: string
  type: IssueType
  severity: IssueSeverity
  title: string
  description?: string
  reproduction_steps?: string
  expected_result?: string
  actual_result?: string
  environment?: Record<string, string>
  source?: 'internal' | 'customer'
  assigned_to?: string
  task_id?: string
  labels?: string[]
}
