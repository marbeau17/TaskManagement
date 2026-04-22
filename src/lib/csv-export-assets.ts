// =============================================================================
// CSV export utility for assets
// Columns match the source Excel ( docs/【Meets】資産管理表.xlsx ) order so the
// file round-trips cleanly through the import modal.
// =============================================================================

import type { Asset } from '@/types/database'
import { t, type Locale } from '@/lib/i18n/translations'

interface CsvColumn {
  headerKey: string
  accessor: (asset: Asset, ownerNameMap: Map<string, string>) => string
}

const CATEGORY_KEY: Record<string, string> = {
  pc: 'asset.categoryPc',
  monitor: 'asset.categoryMonitor',
  tablet: 'asset.categoryTablet',
  peripheral: 'asset.categoryPeripheral',
  furniture: 'asset.categoryFurniture',
  license: 'asset.categoryLicense',
  other: 'asset.categoryOther',
}

const STATUS_KEY: Record<string, string> = {
  in_use: 'asset.statusInUse',
  spare: 'asset.statusSpare',
  disposed: 'asset.statusDisposed',
  loaned: 'asset.statusLoaned',
}

function formatDate(value: string | null): string {
  if (!value) return ''
  return value.slice(0, 10)
}

function formatPrice(value: number | null): string {
  if (value == null) return ''
  return String(value)
}

function resolveOwner(asset: Asset, ownerNameMap: Map<string, string>): string {
  if (asset.owner_user_id) {
    return ownerNameMap.get(asset.owner_user_id) ?? asset.owner_name ?? ''
  }
  return asset.owner_name ?? ''
}

const CSV_COLUMNS: CsvColumn[] = [
  { headerKey: 'asset.seqNo', accessor: (a) => (a.seq_no != null ? String(a.seq_no) : '') },
  { headerKey: 'asset.name', accessor: (a) => a.name ?? '' },
  { headerKey: 'asset.acquiredDate', accessor: (a) => formatDate(a.acquired_date) },
  { headerKey: 'asset.acquiredPrice', accessor: (a) => formatPrice(a.acquired_price) },
  { headerKey: 'asset.managementId', accessor: (a) => a.management_id ?? '' },
  { headerKey: 'asset.owner', accessor: (a, m) => resolveOwner(a, m) },
  {
    headerKey: 'asset.category',
    accessor: (a) => {
      const key = CATEGORY_KEY[a.category]
      return key ? '' : String(a.category)
    },
  },
  {
    headerKey: 'asset.status',
    accessor: (a) => {
      const key = STATUS_KEY[a.status]
      return key ? '' : String(a.status)
    },
  },
  { headerKey: 'asset.serialNumber', accessor: (a) => a.serial_number ?? '' },
  { headerKey: 'asset.location', accessor: (a) => a.location ?? '' },
  { headerKey: 'asset.notes', accessor: (a) => (a.notes ?? '').replace(/\r?\n/g, ' ') },
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
  assets: Asset[],
  locale: Locale,
  ownerNameMap: Map<string, string>,
): string {
  const header = CSV_COLUMNS.map((col) => escapeCsvValue(t(locale, col.headerKey))).join(',')

  const rows = assets.map((asset) =>
    CSV_COLUMNS.map((col) => {
      // Category/status cells want the *translated label*, computed at render-time
      // because the accessor doesn't have locale context.
      if (col.headerKey === 'asset.category') {
        const key = CATEGORY_KEY[asset.category]
        return escapeCsvValue(key ? t(locale, key) : String(asset.category))
      }
      if (col.headerKey === 'asset.status') {
        const key = STATUS_KEY[asset.status]
        return escapeCsvValue(key ? t(locale, key) : String(asset.status))
      }
      return escapeCsvValue(col.accessor(asset, ownerNameMap))
    }).join(','),
  )

  return [header, ...rows].join('\r\n')
}

/**
 * Trigger a download of the given assets as a CSV file.
 * @param assets - Assets to export (respect caller-side filtering).
 * @param locale - Header locale. Headers drive column identification on re-import.
 * @param ownerNameMap - userId → display-name lookup to resolve owner_user_id.
 */
export function exportAssetsCsv(
  assets: Asset[],
  locale: Locale = 'ja',
  ownerNameMap: Map<string, string> = new Map(),
): void {
  const csv = buildCsv(assets, locale, ownerNameMap)

  const BOM = '\uFEFF'
  const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const today = new Date().toISOString().slice(0, 10)
  const fileName = `assets_${today}.csv`

  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
