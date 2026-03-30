'use client'

import { useI18n } from '@/hooks/useI18n'

const PAGE_SIZE_OPTIONS = [10, 20, 100, 0] as const // 0 = All

interface PaginationProps {
  page: number
  pageSize: number // 0 means "all"
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
  const effectivePageSize = pageSize === 0 ? totalCount : pageSize
  const totalPages = effectivePageSize > 0 ? Math.max(1, Math.ceil(totalCount / effectivePageSize)) : 1

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
              {size === 0 ? t('pagination.all') : size}
            </option>
          ))}
        </select>
      </div>

      {/* Navigation */}
      {pageSize !== 0 && totalPages > 1 && (
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
      )}

      {/* Total count */}
      <span className="text-[12px] text-text2">
        {t('pagination.total')}: {totalCount}
      </span>
    </div>
  )
}
