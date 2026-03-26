'use client'

import Link from 'next/link'
import { Topbar } from '@/components/layout'
import { PeriodToggle, NotificationBell } from '@/components/shared'
import {
  KpiCards,
  CreatorWorkload,
  DeadlineAlerts,
  UnassignedTasks,
  ClientView,
  RecentActivity,
} from '@/components/dashboard'
import { useUiStore } from '@/stores/uiStore'
import { getWeekRange } from '@/lib/date-utils'
import { PERIOD_OPTIONS } from '@/lib/constants'

export default function DashboardPage() {
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
        title="ダッシュボード"
        subtitle={`今週: ${weekRange.label}`}
      >
        <PeriodToggle
          options={PERIOD_OPTIONS}
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
          + タスク依頼
        </Link>
      </Topbar>

      {/* Main content area */}
      <div className="flex-1 overflow-y-auto p-[12px] md:p-[20px] flex flex-col gap-[16px]">
        {/* KPI Cards */}
        <KpiCards />

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
            👤 クリエイター別
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
            🏢 クライアント別
          </button>
        </div>

        {/* Tab content */}
        {dashboardView === 'creator' ? (
          <div className="flex flex-col md:grid md:grid-cols-[1.7fr_1fr] gap-[16px]">
            {/* Left column: Creator workload */}
            <CreatorWorkload />

            {/* Right column: Alerts + Unassigned */}
            <div className="flex flex-col gap-[12px]">
              <DeadlineAlerts />
              <UnassignedTasks />
            </div>
          </div>
        ) : (
          <ClientView />
        )}

        {/* Recent activity feed */}
        <RecentActivity />
      </div>
    </>
  )
}
