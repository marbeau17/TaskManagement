'use client'

import { KpiCard } from '@/components/shared/KpiCard'
import { useI18n } from '@/hooks/useI18n'
import type { MyPageSummary } from '@/types/mypage'

interface Props {
  summary: MyPageSummary
  isLoading?: boolean
}

export function MyPageSummaryCards({ summary, isLoading }: Props) {
  const { t } = useI18n()

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-[12px]">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-surface border border-border2 rounded-[10px] p-[13px] shadow h-[88px] animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-[12px]">
      <KpiCard
        label={t('mypage.summary.todayTasks')}
        value={summary.today_task_count}
        unit={t('kpi.unit.count')}
        variant="mint"
      />
      <KpiCard
        label={t('mypage.summary.weekTasks')}
        value={summary.week_task_count}
        unit={t('kpi.unit.count')}
        variant="mint"
      />
      <KpiCard
        label={t('mypage.summary.utilization')}
        value={summary.utilization_rate}
        unit="%"
        subText={
          summary.utilization_rate >= 100
            ? t('mypage.warnings.overloaded') ?? '超過'
            : summary.utilization_rate >= 80
              ? t('mypage.warnings.warning') ?? '注意'
              : ''
        }
        subColor={
          summary.utilization_rate >= 100 ? '#C05050'
            : summary.utilization_rate >= 80 ? '#C8A030'
              : undefined
        }
        variant={summary.utilization_rate >= 100 ? 'danger' : summary.utilization_rate >= 80 ? 'warning' : 'mint'}
      />
      <KpiCard
        label={t('mypage.summary.openIssues')}
        value={summary.open_issue_count}
        unit={t('kpi.unit.count')}
        subText={
          summary.has_critical_issue ? 'Critical' : summary.has_high_issue ? 'High' : ''
        }
        subColor={summary.has_critical_issue ? '#C05050' : summary.has_high_issue ? '#C8A030' : undefined}
        variant={summary.has_critical_issue ? 'danger' : summary.has_high_issue ? 'warning' : 'mint'}
      />
    </div>
  )
}
