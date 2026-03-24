'use client'

import { KpiCard } from '@/components/shared'
import type { WorkloadKpiData } from '@/types/workload'

interface WorkloadKpiProps {
  data: WorkloadKpiData
}

export function WorkloadKpi({ data }: WorkloadKpiProps) {
  const prevWeekDiff = '+3pt' // mock comparison

  return (
    <div className="grid grid-cols-4 gap-[12px]">
      <KpiCard
        label="チーム平均稼働率"
        value={data.team_avg_utilization}
        unit="%"
        subText={`先週比 ${prevWeekDiff}`}
        variant="mint"
      />
      <KpiCard
        label="今週 実績工数合計"
        value={data.total_actual_hours.toFixed(1)}
        unit="h"
        subText={`見積 ${data.total_estimated_hours.toFixed(1)}h 対比`}
        variant="info"
      />
      <KpiCard
        label="タスク完了率"
        value={data.completion_rate}
        unit="%"
        subText={`${data.completed_count} / ${data.total_count}件`}
        variant="mint"
      />
      <KpiCard
        label="稼働超過メンバー"
        value={data.overloaded_count}
        unit="名"
        subText={
          data.overloaded_members.length > 0
            ? data.overloaded_members.join(', ')
            : 'なし'
        }
        subColor={data.overloaded_count > 0 ? '#C05050' : undefined}
        variant="danger"
      />
    </div>
  )
}
