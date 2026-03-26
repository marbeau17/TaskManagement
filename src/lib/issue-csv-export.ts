// =============================================================================
// Issue CSV Export
// =============================================================================

import type { Issue } from '@/types/issue'

/**
 * Exports an array of issues as a UTF-8 CSV file with BOM for Excel compatibility.
 * Triggers an automatic download in the browser.
 */
export function exportIssuesCsv(issues: Issue[]): void {
  const headers = [
    'issue_key',
    'type',
    'severity',
    'status',
    'title',
    'assignee',
    'project',
    'reporter',
    'source',
    'created_at',
    'resolved_at',
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
