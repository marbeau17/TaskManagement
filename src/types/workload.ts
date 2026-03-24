// =============================================================================
// Workload analysis types
// =============================================================================

import { User } from './database'

export type WorkloadStatus = 'normal' | 'warning' | 'overloaded' | 'available'

/** Per-member workload summary row */
export interface WorkloadSummary {
  user: User
  task_count: number
  completed_count: number
  estimated_hours: number
  actual_hours: number
  capacity_hours: number
  /** 0-100+ percentage of capacity consumed */
  utilization_rate: number
  status: WorkloadStatus
}

/** Team-level KPI aggregation */
export interface WorkloadKpiData {
  team_avg_utilization: number
  total_actual_hours: number
  total_estimated_hours: number
  completion_rate: number
  completed_count: number
  total_count: number
  overloaded_count: number
  overloaded_members: string[]
}
