'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Topbar } from '@/components/layout'
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
import { useMock } from '@/lib/utils'

function DebugPanel() {
  const [info, setInfo] = useState<Record<string, string>>({})

  useEffect(() => {
    const debug: Record<string, string> = {
      SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || '(empty)',
      ANON_KEY_PREFIX: (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').substring(0, 20) + '...',
      USE_MOCK_RESULT: String(useMock()),
      timestamp: new Date().toISOString(),
    }

    // Test Supabase connection
    const testSupabase = async () => {
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()
        const { data: { user }, error: authErr } = await supabase.auth.getUser()
        debug.AUTH_USER = user ? `${user.email} (${user.id.substring(0,8)})` : 'null'
        debug.AUTH_ERROR = authErr?.message || 'none'

        const { data: tasks, error: taskErr } = await supabase.from('tasks').select('id').limit(3)
        debug.TASKS_COUNT = tasks ? String(tasks.length) : 'null'
        debug.TASKS_ERROR = taskErr?.message || 'none'

        const { data: users, error: userErr } = await supabase.from('users').select('id').limit(3)
        debug.USERS_COUNT = users ? String(users.length) : 'null'
        debug.USERS_ERROR = userErr?.message || 'none'
      } catch (e: unknown) {
        debug.EXCEPTION = String(e)
      }
      setInfo({ ...debug })
    }
    testSupabase()
  }, [])

  return (
    <div className="bg-yellow-100 border border-yellow-400 rounded-lg p-3 mb-4 text-xs font-mono text-black">
      <div className="font-bold mb-1">🔧 DEBUG PANEL (will be removed)</div>
      {Object.entries(info).map(([k, v]) => (
        <div key={k}><span className="font-semibold">{k}:</span> {v}</div>
      ))}
      {Object.keys(info).length === 0 && <div>Loading debug info...</div>}
    </div>
  )
}

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
      {/* Debug panel - TEMPORARY */}
      <div className="p-4">
        <DebugPanel />
      </div>
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
    </>
  )
}
