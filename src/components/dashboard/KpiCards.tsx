'use client'

import { KpiCard } from '@/components/shared'
import { useTaskStats } from '@/hooks/useTasks'
import { useI18n } from '@/hooks/useI18n'

interface KpiCardsProps {
  period?: 'week' | 'last_week' | 'month' | 'last_month' | 'all'
}

export function KpiCards({ period = 'all' }: KpiCardsProps) {
  const { data: stats, isLoading } = useTaskStats(period)
  const { t } = useI18n()

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-[12px]">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-surface border border-border2 rounded-[10px] p-[13px] shadow h-[88px] animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-[12px]">
      {/* Tasks - period aware */}
      <KpiCard
        label={period === 'week' || period === 'last_week' ? t('kpi.dueThisWeek') : period === 'month' || period === 'last_month' ? t('kpi.dueThisMonth') : t('kpi.activeTasks')}
        value={period === 'week' || period === 'last_week' ? stats.dueThisWeekCount : period === 'month' || period === 'last_month' ? stats.dueThisMonthCount : stats.activeCount}
        unit={t('kpi.unit.count')}
        subText={`${stats.doneCount} ${t('kpi.completed')} / ${stats.totalCount} ${t('kpi.tasks')}`}
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

      {/* Velocity */}
      <KpiCard
        label={t('kpi.velocity')}
        value={stats.velocity}
        unit={t('kpi.unit.tasksWeek')}
        subText={stats.rejectionRate > 0 ? `${t('kpi.rejectionRate')}: ${stats.rejectionRate}%` : t('kpi.noRejections')}
        subColor={stats.rejectionRate > 5 ? '#C8A030' : undefined}
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
