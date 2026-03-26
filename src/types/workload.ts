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

/** Per-client hours segment for the resource load chart */
export interface ClientHoursSegment {
  client_id: string
  client_name: string
  hours: number
}

/** Per-member resource load data for stacked bar chart */
export interface ResourceLoadEntry {
  user_id: string
  user_name: string
  user_name_short: string
  capacity_hours: number
  total_assigned_hours: number
  utilization_rate: number
  /** Keyed by client_name for recharts dynamic keys */
  client_hours: Record<string, number>
}

/** Full resource load chart data */
export interface ResourceLoadData {
  entries: ResourceLoadEntry[]
  client_names: string[]
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
