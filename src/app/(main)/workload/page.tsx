'use client'

import { useState, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { useI18n } from '@/hooks/useI18n'
import { Topbar } from '@/components/layout'
import { PeriodToggle, TableSkeleton } from '@/components/shared'
import { WorkloadKpi } from '@/components/workload/WorkloadKpi'
import { MemberWorkloadTable } from '@/components/workload/MemberWorkloadTable'
import { CapacityMatrix } from '@/components/workload/CapacityMatrix'
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
  const [weekOffset, setWeekOffset] = useState(0)

  const weekStart = useMemo(() => {
    const now = new Date()
    const day = now.getDay()
    const monday = new Date(now)
    monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1) + weekOffset * 7)
    return monday.toISOString().slice(0, 10)
  }, [weekOffset])

  const weekEnd = useMemo(() => {
    const start = new Date(weekStart)
    start.setDate(start.getDate() + 6)
    return start.toISOString().slice(0, 10)
  }, [weekStart])

  const { data: kpi, isLoading: kpiLoading } = useWorkloadKpi()
  const { data: summaries, isLoading: summariesLoading } =
    useWorkloadSummaries(weekStart)
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

        {/* Week Navigation + Member Workload Table */}
        <div className="flex items-center justify-between">
          <h3 className="text-[13px] font-bold text-text">{t('workload.memberTable')}</h3>
          <div className="flex items-center gap-[8px]">
            <button
              onClick={() => setWeekOffset((o) => o - 1)}
              className="text-[11px] text-text2 hover:text-mint px-[6px] py-[2px] rounded border border-wf-border hover:border-mint transition-colors"
            >
              &lsaquo;
            </button>
            <span className="text-[11px] text-text2 font-medium whitespace-nowrap">
              {weekStart.replace(/-/g, '/')} - {weekEnd.replace(/-/g, '/')}
            </span>
            <button
              onClick={() => setWeekOffset((o) => o + 1)}
              className="text-[11px] text-text2 hover:text-mint px-[6px] py-[2px] rounded border border-wf-border hover:border-mint transition-colors"
            >
              &rsaquo;
            </button>
            <button
              onClick={() => setWeekOffset(0)}
              className="text-[10px] text-mint hover:text-mint-d font-medium transition-colors"
            >
              {t('workload.thisWeek')}
            </button>
          </div>
        </div>
        {summariesLoading || !summaries ? (
          <div className="bg-surface border border-border2 rounded-[10px] overflow-hidden">
            <TableSkeleton rows={6} columns={8} />
          </div>
        ) : (
          <MemberWorkloadTable summaries={summaries} />
        )}

        {/* Capacity Planning Matrix */}
        <CapacityMatrix />
      </div>
    </>
  )
}
