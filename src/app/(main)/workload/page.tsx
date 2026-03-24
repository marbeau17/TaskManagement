'use client'

import { useState } from 'react'
import { Topbar } from '@/components/layout'
import { PeriodToggle } from '@/components/shared'
import { WorkloadKpi } from '@/components/workload/WorkloadKpi'
import { MemberWorkloadTable } from '@/components/workload/MemberWorkloadTable'
import { useWorkloadKpi, useWorkloadSummaries } from '@/hooks/useWorkload'
import { PERIOD_OPTIONS } from '@/lib/constants'

export default function WorkloadPage() {
  const [period, setPeriod] = useState('week')
  const { data: kpi, isLoading: kpiLoading } = useWorkloadKpi()
  const { data: summaries, isLoading: summariesLoading } =
    useWorkloadSummaries()

  return (
    <>
      <Topbar title="稼働管理">
        <PeriodToggle
          options={PERIOD_OPTIONS}
          value={period}
          onChange={setPeriod}
        />
      </Topbar>

      <div className="flex-1 overflow-auto p-[20px] space-y-[16px]">
        {/* KPI Cards */}
        {kpiLoading || !kpi ? (
          <div className="grid grid-cols-4 gap-[12px]">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="bg-surface border border-border2 rounded-[10px] h-[90px] animate-pulse"
              />
            ))}
          </div>
        ) : (
          <WorkloadKpi data={kpi} />
        )}

        {/* Member Workload Table */}
        {summariesLoading || !summaries ? (
          <div className="bg-surface border border-border2 rounded-[10px] h-[300px] animate-pulse" />
        ) : (
          <MemberWorkloadTable summaries={summaries} />
        )}
      </div>
    </>
  )
}
