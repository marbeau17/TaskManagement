// =============================================================================
// Application-wide constants
// =============================================================================

import type { TaskStatus, BuiltinRole, AvatarColor } from '@/types/database'
import type { WorkloadStatus } from '@/types/workload'

export const APP_NAME = 'WorkFlow'

// ---------------------------------------------------------------------------
// Task status
// ---------------------------------------------------------------------------

export const STATUS_LABELS: Record<TaskStatus, string> = {
  waiting: '\u23F3 \u30A2\u30B5\u30A4\u30F3\u5F85\u3061',
  todo: '\uD83D\uDCCB \u672A\u7740\u624B',
  in_progress: '\u25B6 \u9032\u884C\u4E2D',
  done: '\u2713 \u5B8C\u4E86',
  rejected: '\u21A9 \u5DEE\u3057\u623B\u3057',
}

export const STATUS_STYLES: Record<
  TaskStatus,
  { bg: string; text: string; border: string }
> = {
  waiting: {
    bg: 'bg-warn-bg',
    text: 'text-warn',
    border: 'border-warn-b',
  },
  todo: {
    bg: 'bg-surf2',
    text: 'text-text2',
    border: 'border-wf-border',
  },
  in_progress: {
    bg: 'bg-info-bg',
    text: 'text-info',
    border: 'border-info-b',
  },
  done: {
    bg: 'bg-ok-bg',
    text: 'text-ok',
    border: 'border-ok-b',
  },
  rejected: {
    bg: 'bg-danger-bg',
    text: 'text-danger',
    border: 'border-danger-b',
  },
}

// ---------------------------------------------------------------------------
// User roles
// ---------------------------------------------------------------------------

export const BUILTIN_ROLES = ['admin', 'director', 'requester', 'creator'] as const

export const ROLE_LABELS: Record<BuiltinRole, string> = {
  admin: '\u7BA1\u7406\u8005',
  director: 'Dir',
  requester: '\u4F9D\u983C\u8005',
  creator: '\u30AF\u30EA\u30A8\u30A4\u30BF\u30FC',
}

export const ROLE_STYLES: Record<
  BuiltinRole,
  { bg: string; text: string; border: string }
> = {
  admin: {
    bg: 'bg-warn-bg',
    text: 'text-warn',
    border: 'border-warn-b',
  },
  director: {
    bg: 'bg-[#EEE6F8]',
    text: 'text-[#5A2A8A]',
    border: 'border-[#C8A8E8]',
  },
  requester: {
    bg: 'bg-req-bg',
    text: 'text-req',
    border: 'border-req-b',
  },
  creator: {
    bg: 'bg-ok-bg',
    text: 'text-ok',
    border: 'border-ok-b',
  },
}

/** Default style for custom (non-builtin) roles */
export const DEFAULT_ROLE_STYLE = {
  bg: 'bg-slate-100',
  text: 'text-slate-600',
  border: 'border-slate-300',
}

/** Get label for any role, falling back to the raw role string for custom roles */
export function getRoleLabel(role: string): string {
  return (ROLE_LABELS as Record<string, string>)[role] ?? role
}

/** Get style for any role, falling back to a neutral default for custom roles */
export function getRoleStyle(role: string): { bg: string; text: string; border: string } {
  return (ROLE_STYLES as Record<string, { bg: string; text: string; border: string }>)[role] ?? DEFAULT_ROLE_STYLE
}

// ---------------------------------------------------------------------------
// Avatar colours
// ---------------------------------------------------------------------------

export const AVATAR_COLORS: Record<AvatarColor, { bg: string; text: string }> =
  {
    'av-a': { bg: '#D8ECEA', text: '#2A6A60' },
    'av-b': { bg: '#E8E0EE', text: '#5A2A8A' },
    'av-c': { bg: '#EEE4D8', text: '#7A5028' },
    'av-d': { bg: '#E0ECF4', text: '#2A5A7A' },
    'av-e': { bg: '#EEE0E4', text: '#7A2A40' },
  }

// ---------------------------------------------------------------------------
// Workload thresholds
// ---------------------------------------------------------------------------

export const WORKLOAD_THRESHOLDS = {
  /** Utilization % at which a warning is shown */
  warning: 80,
  /** Utilization % at which a member is considered overloaded */
  danger: 100,
} as const

// ---------------------------------------------------------------------------
// Workload status display
// ---------------------------------------------------------------------------

export const WORKLOAD_STATUS_LABELS: Record<WorkloadStatus, string> = {
  available: '\u4F59\u88D5\u3042\u308A',
  normal: '\u6B63\u5E38',
  warning: '\u6CE8\u610F',
  overloaded: '\u8D85\u904E',
}

export const WORKLOAD_STATUS_STYLES: Record<
  WorkloadStatus,
  { bg: string; text: string; border: string }
> = {
  available: {
    bg: 'bg-slate-50',
    text: 'text-slate-600',
    border: 'border-slate-200',
  },
  normal: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
  },
  warning: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
  },
  overloaded: {
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200',
  },
}

// ---------------------------------------------------------------------------
// Period filter options
// ---------------------------------------------------------------------------

export const PERIOD_OPTIONS = [
  { label: '\u4ECA\u9031', value: 'week' as const },
  { label: '\u4ECA\u6708', value: 'month' as const },
  { label: '\u5168\u671F\u9593', value: 'all' as const },
]

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

export const DEFAULT_PAGE_SIZE = 20
