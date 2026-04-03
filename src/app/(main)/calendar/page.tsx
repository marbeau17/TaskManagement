'use client'

import { Topbar } from '@/components/layout'
import { NotificationBell } from '@/components/shared'
import { useI18n } from '@/hooks/useI18n'
import { CalendarConnect } from '@/components/calendar/CalendarConnect'
import { CalendarFindTime } from '@/components/calendar/CalendarFindTime'

export default function CalendarPage() {
  const { t } = useI18n()

  return (
    <>
      <Topbar title={t('calendar.pageTitle')}>
        <NotificationBell />
      </Topbar>

      <div className="flex-1 overflow-y-auto p-[12px] md:p-[20px] flex flex-col gap-[16px]">
        <CalendarConnect />
        <CalendarFindTime />
      </div>
    </>
  )
}
