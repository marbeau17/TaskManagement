// =============================================================================
// Issue CSV Export
// =============================================================================

import type { Issue } from '@/types/issue'
import { t, type Locale } from '@/lib/i18n/translations'

/**
 * Exports an array of issues as a UTF-8 CSV file with BOM for Excel compatibility.
 * Triggers an automatic download in the browser.
 * @param locale - The locale to use for column headers (defaults to 'ja')
 */
export function exportIssuesCsv(issues: Issue[], locale: Locale = 'ja'): void {
  const headers = [
    t(locale, 'csv.issue.issueKey'),
    t(locale, 'csv.issue.type'),
    t(locale, 'csv.issue.severity'),
    t(locale, 'csv.issue.status'),
    t(locale, 'csv.issue.title'),
    t(locale, 'csv.issue.assignee'),
    t(locale, 'csv.issue.project'),
    t(locale, 'csv.issue.reporter'),
    t(locale, 'csv.issue.source'),
    t(locale, 'csv.issue.createdAt'),
    t(locale, 'csv.issue.resolvedAt'),
  ]

  const rows = issues.map((issue) => [
    issue.issue_key,
    issue.type,
    issue.severity,
    issue.status,
    issue.title,
    issue.assignee?.name ?? '',
    issue.project?.name ?? '',
    issue.reporter?.name ?? '',
    issue.source,
    issue.created_at,
    issue.status === 'resolved' || issue.status === 'verified' || issue.status === 'closed'
      ? issue.updated_at
      : '',
  ])

  const escapeCsvField = (field: string): string => {
    if (field.includes(',') || field.includes('"') || field.includes('\n')) {
      return `"${field.replace(/"/g, '""')}"`
    }
    return field
  }

  const csvLines = [
    headers.join(','),
    ...rows.map((row) => row.map(escapeCsvField).join(',')),
  ]

  const csvContent = csvLines.join('\r\n')

  // BOM + UTF-8 for Excel
  const bom = '\uFEFF'
  const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' })

  // Auto-download
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', `issues_${new Date().toISOString().slice(0, 10)}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
