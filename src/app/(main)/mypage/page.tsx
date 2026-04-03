'use client'

import { Topbar } from '@/components/layout'
import { NotificationBell } from '@/components/shared'
import { useAuth } from '@/hooks/useAuth'
import { useMyPage } from '@/hooks/useMyPage'
import { useI18n } from '@/hooks/useI18n'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { MyPageSummaryCards } from '@/components/mypage/MyPageSummaryCards'
import { MyPageWarnings } from '@/components/mypage/MyPageWarnings'
import { MyTodayTasks } from '@/components/mypage/MyTodayTasks'
import { MyWeekTasks } from '@/components/mypage/MyWeekTasks'
import { MyIssues } from '@/components/mypage/MyIssues'
import { MyRecentActivity } from '@/components/mypage/MyRecentActivity'
import { ReleaseNoteBanner } from '@/components/mypage/ReleaseNoteBanner'
import { MyTodayMeetings } from '@/components/mypage/MyTodayMeetings'

const DAY_NAMES = ['日', '月', '火', '水', '木', '金', '土']

export default function MyPagePage() {
  const { user } = useAuth()
  const { data, isLoading } = useMyPage()
  const { t, locale } = useI18n()

  const today = new Date()
  const dateLabel = locale === 'ja'
    ? `${format(today, 'yyyy/MM/dd')} (${DAY_NAMES[today.getDay()]})`
    : format(today, 'yyyy/MM/dd (EEE)')

  const emptyData = {
    summary: { today_task_count: 0, week_task_count: 0, utilization_rate: 0, open_issue_count: 0, has_critical_issue: false, has_high_issue: false },
    warnings: [],
    today_tasks: [],
    week_tasks: [],
    my_issues: [],
    recent_activities: [],
  }

  const pageData = data ?? emptyData

  return (
    <>
      <Topbar
        title={`${t('mypage.title')} — ${user?.name ?? ''}`}
        subtitle={dateLabel}
      >
        <NotificationBell />
      </Topbar>

      <div className="flex-1 overflow-y-auto p-[12px] md:p-[20px] flex flex-col gap-[16px]">
        {/* Release Notes */}
        <ReleaseNoteBanner />

        {/* Summary Cards */}
        <MyPageSummaryCards summary={pageData.summary} isLoading={isLoading} />

        {/* Warnings */}
        <MyPageWarnings warnings={pageData.warnings} isLoading={isLoading} />

        {/* Today Tasks + Meetings + Issues (3-col on desktop) */}
        <div className="flex flex-col lg:grid lg:grid-cols-[1fr_0.8fr_1fr] gap-[16px]">
          <MyTodayTasks tasks={pageData.today_tasks} isLoading={isLoading} />
          <MyTodayMeetings isLoading={isLoading} />
          <MyIssues issues={pageData.my_issues} isLoading={isLoading} />
        </div>

        {/* Week Tasks */}
        <MyWeekTasks tasks={pageData.week_tasks} isLoading={isLoading} />

        {/* Recent Activity */}
        <MyRecentActivity activities={pageData.recent_activities} isLoading={isLoading} />
      </div>
    </>
  )
}
