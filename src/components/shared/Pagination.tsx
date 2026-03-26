'use client'

import { useI18n } from '@/hooks/useI18n'

const PAGE_SIZE_OPTIONS = [10, 25, 50] as const

interface PaginationProps {
  page: number
  pageSize: number
  totalCount: number
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
}

export function Pagination({
  page,
  pageSize,
  totalCount,
  onPageChange,
  onPageSizeChange,
}: PaginationProps) {
  const { t } = useI18n()
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

  const btnBase = `
    h-[30px] min-w-[30px] px-[8px] rounded-[6px] text-[12px] font-semibold
    border border-wf-border text-text2
    hover:bg-surf2 transition-colors
    disabled:opacity-40 disabled:cursor-not-allowed
  `

  return (
    <div className="flex items-center justify-between gap-[12px] flex-wrap">
      {/* Page size selector */}
      <div className="flex items-center gap-[8px]">
        <span className="text-[12px] text-text2">{t('pagination.rowsPerPage')}</span>
        <select
          value={pageSize}
          onChange={(e) => {
            onPageSizeChange(Number(e.target.value))
            onPageChange(1)
          }}
          className="
            h-[30px] px-[8px] rounded-[6px] text-[12px]
            border border-wf-border bg-surface text-text
            focus:outline-none focus:ring-1 focus:ring-mint
            cursor-pointer
          "
        >
          {PAGE_SIZE_OPTIONS.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      </div>

      {/* Navigation */}
      <div className="flex items-center gap-[6px]">
        <button
          onClick={() => onPageChange(1)}
          disabled={page <= 1}
          className={btnBase}
          aria-label={t('pagination.first')}
        >
          &laquo;
        </button>
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className={btnBase}
          aria-label={t('pagination.prev')}
        >
          &lsaquo;
        </button>

        <span className="px-[10px] text-[12px] font-semibold text-text whitespace-nowrap">
          {page} / {totalPages}
        </span>

        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className={btnBase}
          aria-label={t('pagination.next')}
        >
          &rsaquo;
        </button>
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={page >= totalPages}
          className={btnBase}
          aria-label={t('pagination.last')}
        >
          &raquo;
        </button>
      </div>

      {/* Total count */}
      <span className="text-[12px] text-text2">
        {t('pagination.total')}: {totalCount}
      </span>
    </div>
  )
}
