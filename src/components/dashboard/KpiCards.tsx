'use client'

import { KpiCard } from '@/components/shared'
import { useTaskStats } from '@/hooks/useTasks'
import { useI18n } from '@/hooks/useI18n'

export function KpiCards() {
  const { data: stats, isLoading } = useTaskStats()
  const { t } = useI18n()

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[12px]">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-surface border border-border2 rounded-[10px] p-[13px] shadow h-[88px] animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[12px]">
      {/* Tasks this week */}
      <KpiCard
        label={t('kpi.thisWeekTasks')}
        value={stats.totalCount}
        unit={t('kpi.unit.count')}
        subText={`${t('kpi.comparedLastWeek')} +${stats.totalCount}${t('kpi.tasks')}`}
        subColor="#4A9482"
        variant="mint"
      />

      {/* Awaiting assignment */}
      <KpiCard
        label={t('kpi.waitingAssign')}
        value={stats.waitingCount}
        unit={t('kpi.unit.count')}
        subText={stats.waitingCount > 0 ? t('kpi.needsAttention') : t('kpi.noAttentionNeeded')}
        subColor={stats.waitingCount > 0 ? '#C8A030' : undefined}
        variant="warning"
      />

      {/* Completion rate */}
      <KpiCard
        label={t('kpi.completionRate')}
        value={stats.completionRate}
        unit={t('kpi.unit.percent')}
        subText={`${stats.doneCount} / ${stats.totalCount} ${t('kpi.completed')}`}
        variant="mint"
      />

      {/* Overdue */}
      <KpiCard
        label={t('kpi.overdue')}
        value={stats.overdueCount}
        unit={t('kpi.unit.count')}
        subText={stats.overdueCount > 0 ? t('kpi.needsImmediateAction') : t('kpi.noOverdue')}
        subColor={stats.overdueCount > 0 ? '#C05050' : undefined}
        variant="danger"
      />
    </div>
  )
}
