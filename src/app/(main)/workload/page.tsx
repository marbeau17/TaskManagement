'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { useI18n } from '@/hooks/useI18n'
import { Topbar } from '@/components/layout'
import { PeriodToggle, TableSkeleton } from '@/components/shared'
import { WorkloadKpi } from '@/components/workload/WorkloadKpi'
import { MemberWorkloadTable } from '@/components/workload/MemberWorkloadTable'
import { useWorkloadKpi, useWorkloadSummaries, useResourceLoadData } from '@/hooks/useWorkload'

const ResourceLoadChart = dynamic(
  () => import('@/components/workload/ResourceLoadChart').then(mod => mod.ResourceLoadChart),
  {
    ssr: false,
    loading: () => <div className="animate-pulse bg-surf2 rounded-lg h-[300px]" />,
  }
)
import { PERIOD_OPTIONS } from '@/lib/constants'

export default function WorkloadPage() {
  const { t } = useI18n()
  const [period, setPeriod] = useState('week')
  const { data: kpi, isLoading: kpiLoading } = useWorkloadKpi()
  const { data: summaries, isLoading: summariesLoading } =
    useWorkloadSummaries()
  const { data: resourceData, isLoading: loadingResource } = useResourceLoadData()

  return (
    <>
      <Topbar title={t('workload.title')}>
        <PeriodToggle
          options={PERIOD_OPTIONS}
          value={period}
          onChange={setPeriod}
        />
      </Topbar>

      <div className="flex-1 overflow-auto p-[12px] md:p-[20px] space-y-[16px]">
        {/* KPI Cards */}
        {kpiLoading || !kpi ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[12px]">
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

        {/* Resource Load Chart */}
        {loadingResource || !resourceData ? (
          <div className="bg-surface border border-border2 rounded-[10px] h-[420px] animate-pulse" />
        ) : (
          <ResourceLoadChart data={resourceData} />
        )}

        {/* Member Workload Table */}
        {summariesLoading || !summaries ? (
          <div className="bg-surface border border-border2 rounded-[10px] overflow-hidden">
            <TableSkeleton rows={6} columns={8} />
          </div>
        ) : (
          <MemberWorkloadTable summaries={summaries} />
        )}
      </div>
    </>
  )
}
