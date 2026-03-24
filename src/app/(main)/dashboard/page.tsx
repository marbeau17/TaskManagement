'use client'

import Link from 'next/link'
import { Shell, Topbar } from '@/components/layout'
import { PeriodToggle } from '@/components/shared'
import {
  KpiCards,
  CreatorWorkload,
  DeadlineAlerts,
  UnassignedTasks,
  ClientView,
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
    <Shell activePage="dashboard">
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
        <button
          className="relative w-[32px] h-[32px] flex items-center justify-center rounded-[8px] hover:bg-surf2 transition-colors text-text2"
          aria-label="通知"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          <span className="absolute top-[4px] right-[4px] w-[6px] h-[6px] bg-[#C05050] rounded-full" />
        </button>

        {/* + タスク依頼 button */}
        <Link
          href="/tasks/new"
          className="bg-mint-dd text-white text-[12px] font-semibold px-[14px] py-[6px] rounded-[8px] hover:bg-mint-d transition-colors whitespace-nowrap"
        >
          + タスク依頼
        </Link>
      </Topbar>

      {/* Main content area */}
      <div className="flex-1 overflow-y-auto p-[20px] flex flex-col gap-[16px]">
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
          <div className="grid gap-[16px]" style={{ gridTemplateColumns: '1.7fr 1fr' }}>
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
      </div>
    </Shell>
  )
}
