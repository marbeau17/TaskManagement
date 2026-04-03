'use client'

import { useEffect, useState } from 'react'
import { Calendar, Clock, AlertTriangle } from 'lucide-react'
import { useI18n } from '@/hooks/useI18n'

interface ScheduledActivity {
  id: string
  activity_type: string
  subject: string
  scheduled_at: string
  entity_type: string
  entity_id: string
  is_completed: boolean
  user?: { name: string }
}

export function CrmUpcomingTasks() {
  const { t } = useI18n()
  const [activities, setActivities] = useState<ScheduledActivity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/crm/activities?pageSize=50')
      .then(r => r.json())
      .then(data => {
        const items = (data.data ?? []).filter(
          (a: ScheduledActivity) => a.scheduled_at && !a.is_completed
        )
        items.sort((a: ScheduledActivity, b: ScheduledActivity) =>
          new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
        )
        setActivities(items.slice(0, 10))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const now = new Date()
  const isOverdue = (dateStr: string) => new Date(dateStr) < now

  if (loading) {
    return (
      <div className="bg-surface border border-border2 rounded-[10px] shadow p-[16px] animate-pulse">
        <div className="h-[14px] bg-surf2 rounded w-[150px] mb-[12px]" />
        <div className="space-y-[8px]">
          {[1, 2, 3].map(i => <div key={i} className="h-[32px] bg-surf2 rounded" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-surface border border-border2 rounded-[10px] shadow overflow-hidden">
      <div className="px-[12px] py-[10px] border-b border-border2 bg-surf2 flex items-center gap-[6px]">
        <Calendar className="w-[14px] h-[14px] text-text2" />
        <h3 className="text-[13px] font-bold text-text">{t('crm.upcoming.title')}</h3>
        {activities.filter(a => isOverdue(a.scheduled_at)).length > 0 && (
          <span className="text-[9px] bg-danger-bg text-danger px-[6px] py-[1px] rounded-full font-bold border border-danger-b">
            {activities.filter(a => isOverdue(a.scheduled_at)).length} {t('crm.upcoming.overdue')}
          </span>
        )}
      </div>

      {activities.length === 0 ? (
        <div className="p-[16px] text-[12px] text-text3 text-center">{t('crm.upcoming.empty')}</div>
      ) : (
        <div className="divide-y divide-border2">
          {activities.map(a => {
            const overdue = isOverdue(a.scheduled_at)
            const date = new Date(a.scheduled_at)
            const dateStr = date.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })
            const timeStr = date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })

            return (
              <div key={a.id} className={`flex items-center gap-[10px] px-[12px] py-[8px] ${overdue ? 'bg-red-50 dark:bg-red-500/5' : ''}`}>
                {overdue ? (
                  <AlertTriangle className="w-[14px] h-[14px] text-danger shrink-0" />
                ) : (
                  <Clock className="w-[14px] h-[14px] text-text3 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-medium text-text truncate">{a.subject}</p>
                  <p className="text-[10px] text-text3">{a.activity_type} • {a.user?.name ?? ''}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-[11px] font-semibold ${overdue ? 'text-danger' : 'text-text2'}`}>{dateStr}</p>
                  <p className="text-[10px] text-text3">{timeStr}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
