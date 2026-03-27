'use client'

import { useI18n } from '@/hooks/useI18n'
import { KpiCard } from '@/components/shared'
import type { WorkloadKpiData } from '@/types/workload'

interface WorkloadKpiProps {
  data: WorkloadKpiData
}

export function WorkloadKpi({ data }: WorkloadKpiProps) {
  const { t } = useI18n()
  const prevWeekDiff = '+3pt' // mock comparison

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[12px]">
      <KpiCard
        label={t('workload.teamAvgRate')}
        value={data.team_avg_utilization}
        unit={t('workload.unitPercent')}
        subText={`${t('workload.comparedToLastWeek')} ${prevWeekDiff}`}
        variant="mint"
      />
      <KpiCard
        label={t('workload.weeklyActualHours')}
        value={data.total_actual_hours.toFixed(1)}
        unit={t('workload.unitHours')}
        subText={t('workload.estimateComparison').replace('{hours}', data.total_estimated_hours.toFixed(1))}
        variant="info"
      />
      <KpiCard
        label={t('workload.taskCompletionRate')}
        value={data.completion_rate}
        unit={t('workload.unitPercent')}
        subText={t('workload.taskCountOf').replace('{completed}', String(data.completed_count)).replace('{total}', String(data.total_count))}
        variant="mint"
      />
      <KpiCard
        label={t('workload.overloadedMembers')}
        value={data.overloaded_count}
        unit={t('workload.unitPeople')}
        subText={
          data.overloaded_members.length > 0
            ? data.overloaded_members.join(', ')
            : t('workload.none')
        }
        subColor={data.overloaded_count > 0 ? '#C05050' : undefined}
        variant="danger"
      />
    </div>
  )
}
