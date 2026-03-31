// =============================================================================
// Application-wide constants
// =============================================================================

import type { TaskStatus, BuiltinRole, AvatarColor } from '@/types/database'
import type { WorkloadStatus } from '@/types/workload'
import type { Locale } from '@/lib/i18n/translations'

export const APP_NAME = 'WorkFlow'

// ---------------------------------------------------------------------------
// Task status
// ---------------------------------------------------------------------------

export const STATUS_LABELS: Record<TaskStatus, string> = {
  waiting: '⏳ アサイン待ち',
  todo: '📋 未着手',
  in_progress: '▶ 進行中',
  done: '✓ 完了',
  rejected: '↩ 差し戻し',
  dropped: '⛔ ドロップ',
}

export const STATUS_LABELS_I18N: Record<Locale, Record<TaskStatus, string>> = {
  ja: STATUS_LABELS,
  en: {
    waiting: '⏳ Awaiting',
    todo: '📋 To Do',
    in_progress: '▶ In Progress',
    done: '✓ Done',
    rejected: '↩ Rejected',
    dropped: '⛔ Dropped',
  },
}

export function getStatusLabels(locale: Locale = 'ja'): Record<TaskStatus, string> {
  return STATUS_LABELS_I18N[locale]
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
  dropped: {
    bg: 'bg-gray-100 dark:bg-gray-800',
    text: 'text-gray-500 dark:text-gray-400',
    border: 'border-gray-300 dark:border-gray-600',
  },
}

// ---------------------------------------------------------------------------
// User roles
// ---------------------------------------------------------------------------

export const BUILTIN_ROLES = ['admin', 'director', 'requester', 'creator'] as const

export const ROLE_LABELS: Record<BuiltinRole, string> = {
  admin: '管理者',
  director: 'Dir',
  requester: '依頼者',
  creator: 'クリエイター',
}

export const ROLE_LABELS_I18N: Record<Locale, Record<BuiltinRole, string>> = {
  ja: ROLE_LABELS,
  en: {
    admin: 'Admin',
    director: 'Director',
    requester: 'Requester',
    creator: 'Creator',
  },
}

export function getRoleLabels(locale: Locale = 'ja'): Record<BuiltinRole, string> {
  return ROLE_LABELS_I18N[locale]
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
    bg: 'bg-[#EEE6F8] dark:bg-[#2D1F3D]',
    text: 'text-[#5A2A8A] dark:text-[#C8A8E8]',
    border: 'border-[#C8A8E8] dark:border-[#5A2A8A]',
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
  bg: 'bg-slate-100 dark:bg-slate-800',
  text: 'text-slate-600 dark:text-slate-300',
  border: 'border-slate-300 dark:border-slate-600',
}

/** Get label for any role, falling back to the raw role string for custom roles */
export function getRoleLabel(role: string, locale: Locale = 'ja'): string {
  return (ROLE_LABELS_I18N[locale] as Record<string, string>)[role] ?? role
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
  available: '余裕あり',
  normal: '正常',
  warning: '注意',
  overloaded: '超過',
}

export const WORKLOAD_STATUS_LABELS_I18N: Record<Locale, Record<WorkloadStatus, string>> = {
  ja: WORKLOAD_STATUS_LABELS,
  en: {
    available: 'Available',
    normal: 'Normal',
    warning: 'Warning',
    overloaded: 'Overloaded',
  },
}

export function getWorkloadStatusLabels(locale: Locale = 'ja'): Record<WorkloadStatus, string> {
  return WORKLOAD_STATUS_LABELS_I18N[locale]
}

export const WORKLOAD_STATUS_STYLES: Record<
  WorkloadStatus,
  { bg: string; text: string; border: string }
> = {
  available: {
    bg: 'bg-slate-50 dark:bg-slate-800',
    text: 'text-slate-600 dark:text-slate-300',
    border: 'border-slate-200 dark:border-slate-600',
  },
  normal: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    text: 'text-emerald-700 dark:text-emerald-400',
    border: 'border-emerald-200 dark:border-emerald-800',
  },
  warning: {
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    text: 'text-amber-700 dark:text-amber-400',
    border: 'border-amber-200 dark:border-amber-800',
  },
  overloaded: {
    bg: 'bg-red-50 dark:bg-red-950/40',
    text: 'text-red-700 dark:text-red-400',
    border: 'border-red-200 dark:border-red-800',
  },
}

// ---------------------------------------------------------------------------
// Period filter options
// ---------------------------------------------------------------------------

export const PERIOD_OPTIONS = [
  { label: '今週', value: 'week' as const },
  { label: '今月', value: 'month' as const },
  { label: '全期間', value: 'all' as const },
]

export const PERIOD_OPTIONS_I18N: Record<Locale, typeof PERIOD_OPTIONS> = {
  ja: PERIOD_OPTIONS,
  en: [
    { label: 'This Week', value: 'week' as const },
    { label: 'This Month', value: 'month' as const },
    { label: 'All Time', value: 'all' as const },
  ],
}

export function getPeriodOptions(locale: Locale = 'ja') {
  return PERIOD_OPTIONS_I18N[locale]
}

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

export const DEFAULT_PAGE_SIZE = 20
