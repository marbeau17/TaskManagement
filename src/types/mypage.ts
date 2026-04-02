// =============================================================================
// My Page type definitions
// =============================================================================

import type { TaskWithRelations, ActivityLog } from './database'
import type { Issue } from './issue'

// ---------------------------------------------------------------------------
// Warning Types
// ---------------------------------------------------------------------------

export type WarningType = 'overdue' | 'deadline_soon' | 'overloaded' | 'stale_task' | 'critical_issue'
export type WarningSeverity = 'critical' | 'warning' | 'caution'

export interface MyPageWarning {
  id: string
  type: WarningType
  severity: WarningSeverity
  title: string
  description: string
  link: string
  entity_type: 'task' | 'issue' | 'workload'
  entity_id?: string
  days?: number
}

// ---------------------------------------------------------------------------
// Summary Types
// ---------------------------------------------------------------------------

export interface MyPageSummary {
  today_task_count: number
  week_task_count: number
  utilization_rate: number
  open_issue_count: number
  has_critical_issue: boolean
  has_high_issue: boolean
}

// ---------------------------------------------------------------------------
// Aggregated Response
// ---------------------------------------------------------------------------

export interface MyPageData {
  summary: MyPageSummary
  warnings: MyPageWarning[]
  today_tasks: TaskWithRelations[]
  week_tasks: TaskWithRelations[]
  my_issues: Issue[]
  recent_activities: (ActivityLog & { task?: { id: string; title: string } | null })[]
}
