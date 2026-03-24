// =============================================================================
// CSV export utility for tasks
// =============================================================================

import type { TaskWithRelations } from '@/types/database'
import { STATUS_LABELS } from './constants'
import { formatDate, formatHours } from './utils'

/** Column definition for CSV output */
interface CsvColumn {
  header: string
  accessor: (task: TaskWithRelations) => string
}

const CSV_COLUMNS: CsvColumn[] = [
  { header: 'ID', accessor: (t) => t.id },
  { header: '\u30AF\u30E9\u30A4\u30A2\u30F3\u30C8', accessor: (t) => t.client.name },
  { header: '\u30BF\u30A4\u30C8\u30EB', accessor: (t) => t.title },
  { header: '\u30B9\u30C6\u30FC\u30BF\u30B9', accessor: (t) => STATUS_LABELS[t.status] },
  { header: '\u9032\u6357(%)', accessor: (t) => String(t.progress) },
  { header: '\u4F9D\u983C\u8005', accessor: (t) => t.requester.name },
  {
    header: '\u62C5\u5F53\u8005',
    accessor: (t) => t.assigned_user?.name ?? '',
  },
  {
    header: '\u30C7\u30A3\u30EC\u30AF\u30BF\u30FC',
    accessor: (t) => t.director?.name ?? '',
  },
  {
    header: '\u5E0C\u671B\u7D0D\u671F',
    accessor: (t) => (t.desired_deadline ? formatDate(t.desired_deadline) : ''),
  },
  {
    header: '\u78BA\u5B9A\u7D0D\u671F',
    accessor: (t) =>
      t.confirmed_deadline ? formatDate(t.confirmed_deadline) : '',
  },
  {
    header: '\u898B\u7A4D\u5DE5\u6570',
    accessor: (t) =>
      t.estimated_hours != null ? formatHours(t.estimated_hours) : '',
  },
  { header: '\u5B9F\u7E3E\u5DE5\u6570', accessor: (t) => formatHours(t.actual_hours) },
  { header: '\u4F5C\u6210\u65E5', accessor: (t) => formatDate(t.created_at) },
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
function buildCsv(tasks: TaskWithRelations[]): string {
  const header = CSV_COLUMNS.map((col) => escapeCsvValue(col.header)).join(',')

  const rows = tasks.map((task) =>
    CSV_COLUMNS.map((col) => escapeCsvValue(col.accessor(task))).join(','),
  )

  // BOM prefix for Excel compatibility with Japanese characters
  return [header, ...rows].join('\r\n')
}

/**
 * Generate and trigger a download of a CSV file containing the given tasks.
 * Filename includes a timestamp for uniqueness.
 */
export function exportTasksCsv(tasks: TaskWithRelations[]): void {
  const csv = buildCsv(tasks)

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
