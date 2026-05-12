// =============================================================================
// CSV export utility for members
// =============================================================================

import type { User } from '@/types/database'
import { getRoleLabel } from './constants'
import { t, type Locale } from '@/lib/i18n/translations'

interface CsvColumn {
  headerKey: string
  accessor: (member: User, managerNameMap: Map<string, string>, locale: Locale) => string
}

const CSV_COLUMNS: CsvColumn[] = [
  { headerKey: 'csv.member.id', accessor: (m) => m.id },
  { headerKey: 'csv.member.name', accessor: (m) => m.name },
  { headerKey: 'csv.member.nameShort', accessor: (m) => m.name_short ?? '' },
  { headerKey: 'csv.member.email', accessor: (m) => m.email },
  { headerKey: 'csv.member.role', accessor: (m) => getRoleLabel(m.role) },
  { headerKey: 'csv.member.department', accessor: (m) => m.department ?? '' },
  { headerKey: 'csv.member.title', accessor: (m) => m.title ?? '' },
  { headerKey: 'csv.member.level', accessor: (m) => m.level ?? '' },
  {
    headerKey: 'csv.member.manager',
    accessor: (m, map) => (m.manager_id ? map.get(m.manager_id) ?? '' : ''),
  },
  {
    headerKey: 'csv.member.weeklyCapacity',
    accessor: (m) => String(m.weekly_capacity_hours),
  },
  {
    headerKey: 'csv.member.accessDomains',
    accessor: (m) => (m.access_domains ?? []).join('|'),
  },
  {
    headerKey: 'csv.member.status',
    accessor: (m, _map, locale) =>
      m.is_active ? t(locale, 'members.active') : t(locale, 'members.inactive'),
  },
  {
    headerKey: 'csv.member.createdAt',
    accessor: (m) => (m.created_at ? m.created_at.slice(0, 10) : ''),
  },
]

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

function buildCsv(
  members: User[],
  locale: Locale,
  managerNameMap: Map<string, string>,
): string {
  const header = CSV_COLUMNS.map((col) => escapeCsvValue(t(locale, col.headerKey))).join(',')

  const rows = members.map((member) =>
    CSV_COLUMNS.map((col) => escapeCsvValue(col.accessor(member, managerNameMap, locale))).join(','),
  )

  return [header, ...rows].join('\r\n')
}

/**
 * Trigger a download of the given members as a CSV file.
 * @param members - Members to export (respect caller-side filtering).
 * @param locale - Header locale.
 */
export function exportMembersCsv(members: User[], locale: Locale = 'ja'): void {
  const managerNameMap = new Map<string, string>(
    members.map((m) => [m.id, m.name]),
  )

  const csv = buildCsv(members, locale, managerNameMap)

  // UTF-8 BOM for Excel compatibility
  const BOM = '\uFEFF'
  const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const today = new Date().toISOString().slice(0, 10)
  const fileName = `members_${today}.csv`

  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
