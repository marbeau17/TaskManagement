'use client'

import { useState, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { Topbar } from '@/components/layout'
import { KpiCard } from '@/components/shared'

const CompletionRateChart = dynamic(
  () => import('@/components/reports/CompletionRateChart').then(mod => mod.CompletionRateChart),
  {
    ssr: false,
    loading: () => <div className="animate-pulse bg-surf2 rounded-lg h-[300px]" />,
  }
)

const StatusDistributionChart = dynamic(
  () => import('@/components/reports/StatusDistributionChart').then(mod => mod.StatusDistributionChart),
  {
    ssr: false,
    loading: () => <div className="animate-pulse bg-surf2 rounded-lg h-[300px]" />,
  }
)

const ClientTaskChart = dynamic(
  () => import('@/components/reports/ClientTaskChart').then(mod => mod.ClientTaskChart),
  {
    ssr: false,
    loading: () => <div className="animate-pulse bg-surf2 rounded-lg h-[300px]" />,
  }
)
import { useTasks } from '@/hooks/useTasks'
import { useI18n } from '@/hooks/useI18n'
import type { TaskWithRelations } from '@/types/database'

type DateRange = 'week' | 'month' | '3months'

function getDateRangeStart(range: DateRange): Date {
  const now = new Date()
  now.setHours(0, 0, 0, 0)

  switch (range) {
    case 'week': {
      const day = now.getDay()
      const diff = now.getDate() - day + (day === 0 ? -6 : 1)
      return new Date(now.getFullYear(), now.getMonth(), diff)
    }
    case 'month':
      return new Date(now.getFullYear(), now.getMonth(), 1)
    case '3months':
      return new Date(now.getFullYear(), now.getMonth() - 2, 1)
  }
}

function computeAvgCompletionDays(tasks: TaskWithRelations[]): number | null {
  const completedTasks = tasks.filter((t) => t.status === 'done')
  if (completedTasks.length === 0) return null

  let totalDays = 0
  let count = 0

  completedTasks.forEach((task) => {
    const created = new Date(task.created_at).getTime()
    const updated = new Date(task.updated_at).getTime()
    const diffMs = updated - created
    if (diffMs >= 0) {
      totalDays += diffMs / (1000 * 60 * 60 * 24)
      count++
    }
  })

  return count > 0 ? Math.round((totalDays / count) * 10) / 10 : null
}

export default function ReportsPage() {
  const { t } = useI18n()
  const { data: allTasks, isLoading } = useTasks()
  const [dateRange, setDateRange] = useState<DateRange>('month')

  const filteredTasks = useMemo(() => {
    if (!allTasks) return []
    const start = getDateRangeStart(dateRange)
    return allTasks.filter((task) => new Date(task.created_at) >= start)
  }, [allTasks, dateRange])

  const avgDays = useMemo(
    () => computeAvgCompletionDays(filteredTasks),
    [filteredTasks]
  )

  const completionRate = useMemo(() => {
    if (filteredTasks.length === 0) return 0
    const done = filteredTasks.filter((t) => t.status === 'done').length
    return Math.round((done / filteredTasks.length) * 100)
  }, [filteredTasks])

  const DATE_RANGE_OPTIONS: { value: DateRange; label: string }[] = [
    { value: 'week', label: t('reports.thisWeek') },
    { value: 'month', label: t('reports.thisMonth') },
    { value: '3months', label: t('reports.last3Months') },
  ]

  if (isLoading) {
    return (
      <>
        <Topbar title={t('reports.title')} />
        <div className="flex-1 overflow-y-auto p-[12px] md:p-[20px]">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[12px]">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="bg-surface border border-border2 rounded-[10px] p-[13px] shadow h-[88px] animate-pulse"
              />
            ))}
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Topbar title={t('reports.title')}>
        {/* Date range filter */}
        <div className="flex items-center gap-[2px] bg-surf2 rounded-[8px] p-[3px]">
          {DATE_RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setDateRange(opt.value)}
              className={`
                px-[10px] py-[4px] text-[11px] font-medium rounded-[6px] transition-colors
                ${
                  dateRange === opt.value
                    ? 'bg-surface text-text shadow-sm'
                    : 'text-text2 hover:text-text'
                }
              `}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </Topbar>

      <div className="flex-1 overflow-y-auto p-[12px] md:p-[20px] flex flex-col gap-[16px]">
        {/* KPI Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[12px]">
          <KpiCard
            label={t('reports.total')}
            value={filteredTasks.length}
            unit={t('reports.tasks')}
            variant="info"
          />
          <KpiCard
            label={t('reports.completed')}
            value={filteredTasks.filter((t) => t.status === 'done').length}
            unit={t('reports.tasks')}
            variant="mint"
          />
          <KpiCard
            label={t('reports.completionRate')}
            value={completionRate}
            unit="%"
            subText={`${filteredTasks.filter((t) => t.status === 'done').length} / ${filteredTasks.length}`}
            variant="mint"
          />
          <KpiCard
            label={t('reports.avgCompletionTime')}
            value={avgDays !== null ? avgDays : '-'}
            unit={avgDays !== null ? t('reports.days') : ''}
            variant="purple"
          />
        </div>

        {/* Charts Row 1: Completion Rate + Status Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-[16px]">
          <CompletionRateChart tasks={filteredTasks} dateRange={dateRange} />
          <StatusDistributionChart tasks={filteredTasks} />
        </div>

        {/* Chart Row 2: Tasks by Client */}
        <ClientTaskChart tasks={filteredTasks} />
      </div>
    </>
  )
}
