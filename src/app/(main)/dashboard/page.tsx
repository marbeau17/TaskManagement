'use client'

import Link from 'next/link'
import dynamic from 'next/dynamic'
import { Topbar } from '@/components/layout'
import { PeriodToggle, NotificationBell } from '@/components/shared'
import {
  KpiCards,
  CreatorWorkload,
  DeadlineAlerts,
  UnassignedTasks,
  ClientView,
  RecentActivity,
  ProjectIssueSummary,
  UpcomingTasks,
} from '@/components/dashboard'

const BurndownChart = dynamic(
  () => import('@/components/dashboard/BurndownChart').then(mod => mod.BurndownChart),
  {
    ssr: false,
    loading: () => <div className="animate-pulse bg-surf2 rounded-lg h-[300px]" />,
  }
)

const EstimateVsActualChart = dynamic(
  () => import('@/components/dashboard/EstimateVsActualChart').then(mod => mod.EstimateVsActualChart),
  {
    ssr: false,
    loading: () => <div className="animate-pulse bg-surf2 rounded-lg h-[300px]" />,
  }
)
import { useUiStore } from '@/stores/uiStore'
import { getWeekRange } from '@/lib/date-utils'
import { useI18n } from '@/hooks/useI18n'

export default function DashboardPage() {
  const { t } = useI18n()

  const periodOptions = [
    { label: t('dashboard.periodWeek'), value: 'week' as const },
    { label: t('dashboard.periodMonth'), value: 'month' as const },
    { label: t('dashboard.periodAll'), value: 'all' as const },
  ]

  const {
    dashboardView,
    setDashboardView,
    period,
    setPeriod,
  } = useUiStore()

  const weekRange = getWeekRange()

  return (
    <>
      {/* Topbar */}
      <Topbar
        title={t('dashboard.title')}
        subtitle={`${t('dashboard.thisWeekLabel')}: ${weekRange.label}`}
      >
        <PeriodToggle
          options={periodOptions}
          value={period}
          onChange={(v) => setPeriod(v as typeof period)}
        />

        {/* Notification bell */}
        <NotificationBell />

        {/* + タスク依頼 button */}
        <Link
          href="/tasks/new"
          className="bg-mint-dd text-white text-[12px] font-semibold px-[14px] py-[6px] rounded-[8px] hover:bg-mint-d transition-colors whitespace-nowrap"
        >
          {t('dashboard.newTaskRequest')}
        </Link>
      </Topbar>

      {/* Main content area */}
      <div className="flex-1 overflow-y-auto p-[12px] md:p-[20px] flex flex-col gap-[16px]">
        {/* KPI Cards */}
        <KpiCards period={period} />

        {/* Tab bar */}
        <div className="flex items-center gap-[4px] border-b border-border2 pb-[1px]">
          <button
            onClick={() => setDashboardView('creator')}
            className={`
              px-[16px] py-[8px] text-[12.5px] font-semibold rounded-t-[8px] transition-colors
              ${
                dashboardView === 'creator'
                  ? 'bg-surface text-mint-dd border border-border2 border-b-surface -mb-[1px]'
                  : 'text-text2 hover:text-text hover:bg-surf2'
              }
            `}
          >
            👤 {t('dashboard.creatorView')}
          </button>
          <button
            onClick={() => setDashboardView('client')}
            className={`
              px-[16px] py-[8px] text-[12.5px] font-semibold rounded-t-[8px] transition-colors
              ${
                dashboardView === 'client'
                  ? 'bg-surface text-mint-dd border border-border2 border-b-surface -mb-[1px]'
                  : 'text-text2 hover:text-text hover:bg-surf2'
              }
            `}
          >
            🏢 {t('dashboard.clientView')}
          </button>
        </div>

        {/* Tab content */}
        {dashboardView === 'creator' ? (
          <div className="flex flex-col md:grid md:grid-cols-[1.7fr_1fr] gap-[16px]">
            {/* Left column: Creator workload */}
            <CreatorWorkload />

            {/* Right column: Alerts + Unassigned */}
            <div className="flex flex-col gap-[12px]">
              <UpcomingTasks />
              <DeadlineAlerts />
              <UnassignedTasks />
            </div>
          </div>
        ) : (
          <ClientView />
        )}

        {/* Burndown chart */}
        <BurndownChart />

        {/* Estimate vs Actual chart */}
        <EstimateVsActualChart />

        {/* Project issue summary */}
        <ProjectIssueSummary />

        {/* Recent activity feed */}
        <RecentActivity />
      </div>
    </>
  )
}
