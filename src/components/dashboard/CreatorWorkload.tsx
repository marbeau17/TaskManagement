'use client'

import { Avatar } from '@/components/shared'
import { useWorkloadSummaries } from '@/hooks/useWorkload'
import { useI18n } from '@/hooks/useI18n'
import { formatHours } from '@/lib/utils'
import {
  WORKLOAD_STATUS_LABELS,
  WORKLOAD_STATUS_STYLES,
  WORKLOAD_THRESHOLDS,
} from '@/lib/constants'
import type { WorkloadSummary } from '@/types/workload'

function getBarColor(rate: number): string {
  if (rate >= WORKLOAD_THRESHOLDS.danger) return 'var(--bar-danger, #C05050)'
  if (rate >= WORKLOAD_THRESHOLDS.warning) return 'var(--bar-warning, #C8A030)'
  return 'var(--bar-ok, #4A9482)'
}

function getRateColor(rate: number): string {
  if (rate >= WORKLOAD_THRESHOLDS.danger) return 'text-[#C05050] dark:text-[#E07070]'
  if (rate >= WORKLOAD_THRESHOLDS.warning) return 'text-[#C8A030] dark:text-[#E0C050]'
  return 'text-[#4A9482] dark:text-[#6FB5A3]'
}

function WorkloadRow({ summary }: { summary: WorkloadSummary }) {
  const { user, utilization_rate, actual_hours, estimated_hours, capacity_hours, status } = summary
  const barColor = getBarColor(utilization_rate)
  const rateColor = getRateColor(utilization_rate)
  const statusStyle = WORKLOAD_STATUS_STYLES[status]
  const statusLabel = WORKLOAD_STATUS_LABELS[status]
  const isOverloaded = utilization_rate >= WORKLOAD_THRESHOLDS.danger

  return (
    <>
      {/* Mobile card layout */}
      <div
        className={`md:hidden flex flex-col gap-[6px] px-[12px] py-[8px] border-b border-border2 ${
          isOverloaded ? 'bg-danger-bg' : ''
        }`}
      >
        {/* Line 1: Avatar + name + status */}
        <div className="flex items-center justify-between gap-[8px]">
          <div className="flex items-center gap-[8px] min-w-0">
            <Avatar
              name_short={user.name_short}
              color={user.avatar_color}
              size="sm"
            />
            <span className="text-[12px] text-text truncate">{user.name}</span>
          </div>
          <span
            className={`${statusStyle.bg} ${statusStyle.text} ${statusStyle.border} text-[10px] px-[8px] py-[2px] rounded-full font-semibold border text-center whitespace-nowrap shrink-0`}
          >
            {statusLabel}
          </span>
        </div>

        {/* Line 2: Workload bar + % */}
        <div className="flex items-center gap-[8px]">
          <div className="flex-1 bg-surf2 rounded-full overflow-hidden" style={{ height: 8 }}>
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${Math.min(100, utilization_rate)}%`,
                backgroundColor: barColor,
              }}
            />
          </div>
          <span className={`text-[12px] font-bold shrink-0 ${rateColor}`}>
            {utilization_rate}%
          </span>
        </div>

        {/* Line 3: Hours info */}
        <div className="text-[11px] text-text2">
          {formatHours(actual_hours)} / {formatHours(capacity_hours)}
        </div>
      </div>

      {/* Desktop grid layout */}
      <div
        className={`hidden md:grid grid-cols-[140px_1fr_52px_100px_72px] items-center gap-[8px] px-[12px] py-[8px] border-b border-border2 ${
          isOverloaded ? 'bg-danger-bg' : ''
        }`}
      >
        {/* 担当者 */}
        <div className="flex items-center gap-[8px]">
          <Avatar
            name_short={user.name_short}
            color={user.avatar_color}
            size="sm"
          />
          <span className="text-[12px] text-text truncate">{user.name}</span>
        </div>

        {/* 稼働バー */}
        <div className="w-full bg-surf2 rounded-full overflow-hidden" style={{ height: 8 }}>
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${Math.min(100, utilization_rate)}%`,
              backgroundColor: barColor,
            }}
          />
        </div>

        {/* % */}
        <span className={`text-[12px] font-bold text-right ${rateColor}`}>
          {utilization_rate}%
        </span>

        {/* 実績/見積 */}
        <span className="text-[11px] text-text2 text-right">
          {formatHours(actual_hours)} / {formatHours(capacity_hours)}
        </span>

        {/* 状態チップ */}
        <span
          className={`${statusStyle.bg} ${statusStyle.text} ${statusStyle.border} text-[10px] px-[8px] py-[2px] rounded-full font-semibold border text-center whitespace-nowrap`}
        >
          {statusLabel}
        </span>
      </div>
    </>
  )
}

export function CreatorWorkload() {
  const { data: summaries, isLoading } = useWorkloadSummaries()

  const { t } = useI18n()

  if (isLoading) {
    return (
      <div className="bg-surface border border-border2 rounded-[10px] p-[16px] shadow">
        <div className="text-[12px] text-text3">{t('common.loading')}</div>
      </div>
    )
  }

  return (
    <div className="bg-surface border border-border2 rounded-[10px] shadow overflow-hidden overflow-x-auto">
      {/* Header */}
      <div className="px-[12px] py-[10px] border-b border-border2 bg-surf2">
        <h3 className="text-[13px] font-bold text-text">{t('workload.title')}</h3>
      </div>

      {/* Column headers */}
      <div className="hidden md:grid grid-cols-[140px_1fr_52px_100px_72px] items-center gap-[8px] px-[12px] py-[6px] border-b border-border2 bg-surf2">
        <span className="text-[10px] text-text3 font-semibold">{t('workload.headerAssignee')}</span>
        <span className="text-[10px] text-text3 font-semibold">{t('workload.headerBar')}</span>
        <span className="text-[10px] text-text3 font-semibold text-right">%</span>
        <span className="text-[10px] text-text3 font-semibold text-right">{t('workload.headerActualEstimate')}</span>
        <span className="text-[10px] text-text3 font-semibold text-center">{t('workload.headerStatus')}</span>
      </div>

      {/* Rows */}
      {summaries && summaries.length > 0 ? (
        summaries.map((summary) => (
          <WorkloadRow key={summary.user.id} summary={summary} />
        ))
      ) : (
        <div className="px-[12px] py-[16px] text-[12px] text-text3 text-center">
          {t('common.noData')}
        </div>
      )}
    </div>
  )
}
