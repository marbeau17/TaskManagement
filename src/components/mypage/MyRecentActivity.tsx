'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Avatar } from '@/components/shared'
import { useI18n } from '@/hooks/useI18n'
import type { ActivityLog, ActivityAction } from '@/types/database'

/** ActivityLog extended with optional task relation from joined query */
type ActivityLogWithTask = ActivityLog & {
  task?: { id: string; title: string } | null
}

interface Props {
  activities: ActivityLogWithTask[]
  isLoading?: boolean
}

const ACTION_I18N_KEYS: Record<ActivityAction, string> = {
  created: 'activity.created',
  assigned: 'activity.assigned',
  progress_updated: 'activity.progress_updated',
  status_changed: 'activity.status_changed',
  hours_updated: 'activity.hours_updated',
  comment_added: 'activity.comment_added',
  deadline_changed: 'activity.deadline_changed',
  rejected: 'activity.rejected',
}

const ACTION_STYLE: Record<ActivityAction, { icon: string; color: string }> = {
  created:          { icon: '+', color: 'bg-green-500' },
  assigned:         { icon: '@', color: 'bg-blue-500' },
  progress_updated: { icon: '%', color: 'bg-amber-500' },
  status_changed:   { icon: '~', color: 'bg-purple-500' },
  hours_updated:    { icon: '#', color: 'bg-cyan-500' },
  comment_added:    { icon: '"', color: 'bg-indigo-500' },
  deadline_changed: { icon: '!', color: 'bg-orange-500' },
  rejected:         { icon: 'x', color: 'bg-red-500' },
}

const INITIAL_VISIBLE = 10

function formatTimeAgo(dateStr: string, t: (key: string) => string): string {
  const now = new Date()
  const d = new Date(dateStr)
  const diffMs = now.getTime() - d.getTime()
  const diffMin = Math.floor(diffMs / 60000)

  if (diffMin < 1) return t('dashboard.activityFeed.justNow')
  if (diffMin < 60) return t('dashboard.activityFeed.minutesAgo').replace('{n}', String(diffMin))
  const diffHours = Math.floor(diffMin / 60)
  if (diffHours < 24) return t('dashboard.activityFeed.hoursAgo').replace('{n}', String(diffHours))
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return t('dashboard.activityFeed.daysAgo').replace('{n}', String(diffDays))

  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}/${m}/${day}`
}

export function MyRecentActivity({ activities, isLoading }: Props) {
  const { t } = useI18n()
  const [expanded, setExpanded] = useState(false)

  if (isLoading) {
    return (
      <div className="bg-surface rounded-[10px] border border-border2 shadow-sm p-5" data-testid="mypage-activity">
        <h3 className="text-[13px] font-bold text-text mb-4">{t('mypage.activity.title')}</h3>
        <div className="space-y-[12px] animate-pulse">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <div className="w-5 h-5 rounded-full bg-surf2 shrink-0" />
              <div className="flex-1">
                <div className="h-[12px] bg-surf2 rounded w-3/4 mb-[6px]" />
                <div className="h-[10px] bg-surf2 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const visible = expanded ? activities : activities.slice(0, INITIAL_VISIBLE)
  const hasMore = activities.length > INITIAL_VISIBLE

  return (
    <div className="bg-surface rounded-[10px] border border-border2 shadow-sm p-5" data-testid="mypage-activity">
      <h3 className="text-[13px] font-bold text-text mb-4">
        {t('mypage.activity.title')}
      </h3>

      {activities.length === 0 && (
        <p className="text-[12px] text-text3">{t('dashboard.activityFeed.empty')}</p>
      )}

      <div className="flex flex-col gap-0">
        {visible.map((log, i) => {
          const style = ACTION_STYLE[log.action] ?? { icon: '-', color: 'bg-gray-400' }
          const isLast = i === visible.length - 1

          return (
            <div key={log.id} className="flex gap-3">
              {/* Timeline indicator */}
              <div className="flex flex-col items-center">
                <div className={`w-5 h-5 rounded-full ${style.color} shrink-0 mt-0.5 flex items-center justify-center`}>
                  <span className="text-white text-[10px] font-bold leading-none">{style.icon}</span>
                </div>
                {!isLast && <div className="w-[1px] flex-1 bg-border2 min-h-[16px]" />}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 pb-3 flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] text-text leading-relaxed">
                    {t(ACTION_I18N_KEYS[log.action]) || log.action}
                  </p>
                  {log.task && (
                    <Link
                      href={`/tasks/${log.task.id}`}
                      className="text-[11px] text-mint-dd hover:underline truncate block"
                    >
                      {log.task.title}
                    </Link>
                  )}
                </div>
                <span className="text-[10px] text-text3 whitespace-nowrap flex-shrink-0 pt-0.5">
                  {formatTimeAgo(log.created_at, t)}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-2 text-[11px] text-mint-dd hover:underline font-medium w-full text-center"
        >
          {expanded ? t('dashboard.activityFeed.showLess') : t('dashboard.activityFeed.showMore')}
        </button>
      )}
    </div>
  )
}
