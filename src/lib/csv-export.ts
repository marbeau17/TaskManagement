// =============================================================================
// CSV export utility for tasks
// =============================================================================

import type { TaskWithRelations } from '@/types/database'
import { STATUS_LABELS } from './constants'
import { formatDate, formatHours } from './utils'
import { t, type Locale } from '@/lib/i18n/translations'

/** Column definition for CSV output */
interface CsvColumn {
  headerKey: string
  accessor: (task: TaskWithRelations) => string
}

const CSV_COLUMNS: CsvColumn[] = [
  { headerKey: 'csv.task.id', accessor: (t) => t.id },
  { headerKey: 'csv.task.clientId', accessor: (t) => String(t.client?.seq_id ?? '') },
  { headerKey: 'csv.task.client', accessor: (t) => t.client?.name ?? '' },
  { headerKey: 'csv.task.project', accessor: (t) => t.project?.name ?? '' },
  { headerKey: 'csv.task.title', accessor: (t) => t.title },
  { headerKey: 'csv.task.status', accessor: (t) => STATUS_LABELS[t.status] ?? t.status },
  { headerKey: 'csv.task.progress', accessor: (t) => String(t.progress) },
  { headerKey: 'csv.task.requester', accessor: (t) => t.requester?.name ?? '' },
  {
    headerKey: 'csv.task.assignee',
    accessor: (t) => t.assigned_user?.name ?? '',
  },
  {
    headerKey: 'csv.task.director',
    accessor: (t) => t.director?.name ?? '',
  },
  {
    headerKey: 'csv.task.desiredDeadline',
    accessor: (t) => (t.desired_deadline ? formatDate(t.desired_deadline) : ''),
  },
  {
    headerKey: 'csv.task.confirmedDeadline',
    accessor: (t) =>
      t.confirmed_deadline ? formatDate(t.confirmed_deadline) : '',
  },
  {
    headerKey: 'csv.task.estimatedHours',
    accessor: (t) =>
      t.estimated_hours != null ? formatHours(t.estimated_hours) : '',
  },
  { headerKey: 'csv.task.actualHours', accessor: (t) => formatHours(t.actual_hours ?? 0) },
  { headerKey: 'csv.task.createdAt', accessor: (t) => formatDate(t.created_at) },
]

/**
 * Escape a value for CSV: wrap in double-quotes if it contains
 * commas, double-quotes, or newlines.
 */
function escapeCsvValue(value: string): string {
  if (
    value.includes(',') ||
    value.includes('"') ||
    value.includes('\n') ||
    value.includes('\r')
  ) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

/**
 * Build a CSV string from the given tasks.
 */
function buildCsv(tasks: TaskWithRelations[], locale: Locale): string {
  const header = CSV_COLUMNS.map((col) => escapeCsvValue(t(locale, col.headerKey))).join(',')

  const rows = tasks.map((task) =>
    CSV_COLUMNS.map((col) => escapeCsvValue(col.accessor(task))).join(','),
  )

  // BOM prefix for Excel compatibility with Japanese characters
  return [header, ...rows].join('\r\n')
}

/**
 * Generate and trigger a download of a CSV file containing the given tasks.
 * Filename includes a timestamp for uniqueness.
 * @param locale - The locale to use for column headers (defaults to 'ja')
 */
export function exportTasksCsv(tasks: TaskWithRelations[], locale: Locale = 'ja'): void {
  const csv = buildCsv(tasks, locale)

  // UTF-8 BOM for Excel compatibility
  const BOM = '\uFEFF'
  const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' })

  const url = URL.createObjectURL(blob)
  const timestamp = new Date()
    .toISOString()
    .slice(0, 16)
    .replace(/[-:T]/g, '')
  const fileName = `tasks_${timestamp}.csv`

  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()

  // Cleanup
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
