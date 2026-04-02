'use client'

import { useState } from 'react'
import Link from 'next/link'
import { StatusChip, ProgressBar } from '@/components/shared'
import { useI18n } from '@/hooks/useI18n'
import { getWeekRange, isOverdue, daysUntilDeadline } from '@/lib/date-utils'
import type { TaskWithRelations } from '@/types/database'

interface Props {
  tasks: TaskWithRelations[]
  isLoading?: boolean
}

const PRIORITY_STYLES: Record<number, string> = {
  1: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300',
  2: 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300',
  3: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
  4: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300',
  5: 'bg-gray-100 text-gray-600 dark:bg-gray-500/20 dark:text-gray-300',
}

const INITIAL_SHOW = 10

export function MyWeekTasks({ tasks, isLoading }: Props) {
  const { t } = useI18n()
  const [expanded, setExpanded] = useState(false)
  const weekRange = getWeekRange()

  if (isLoading) {
    return (
      <div className="bg-surface border border-border2 rounded-[10px] shadow overflow-hidden" data-testid="mypage-week-tasks">
        <div className="px-[12px] py-[10px] border-b border-border2 bg-surf2">
          <h3 className="text-[13px] font-bold text-text">{t('mypage.weekTasks.title').replace('{start}', '').replace('{end}', '')}</h3>
        </div>
        <div className="p-[12px] space-y-[8px] animate-pulse">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-[32px] bg-surf2 rounded" />
          ))}
        </div>
      </div>
    )
  }

  const visible = expanded ? tasks : tasks.slice(0, INITIAL_SHOW)
  const hasMore = tasks.length > INITIAL_SHOW

  return (
    <div className="bg-surface border border-border2 rounded-[10px] shadow overflow-hidden" data-testid="mypage-week-tasks">
      <div className="px-[12px] py-[10px] border-b border-border2 bg-surf2 flex items-center justify-between">
        <h3 className="text-[13px] font-bold text-text">
          {t('mypage.weekTasks.title').replace('{start}', weekRange.label.split('\uFF5E')[0] ?? '').replace('{end}', weekRange.label.split('\uFF5E')[1] ?? '')}
        </h3>
        <span className="text-[10px] bg-mint-dd/10 text-mint-dd px-[6px] py-[1px] rounded-full font-bold">
          {tasks.length}
        </span>
      </div>

      {tasks.length === 0 ? (
        <div className="px-[12px] py-[16px] text-[12px] text-text3 text-center">
          {t('mypage.weekTasks.empty')}
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="hidden md:flex items-center gap-[8px] px-[12px] py-[6px] bg-surf2/50 border-b border-border2 text-[10px] text-text3 font-semibold uppercase">
            <span className="w-[32px] shrink-0">P</span>
            <span className="flex-1">{t('mypage.col.title')}</span>
            <span className="w-[80px] shrink-0">{t('mypage.col.status')}</span>
            <span className="w-[70px] shrink-0">{t('mypage.col.progress')}</span>
            <span className="w-[55px] shrink-0 text-right">{t('mypage.col.deadline')}</span>
            <span className="w-[60px] shrink-0 text-right">{t('mypage.col.hours')}</span>
          </div>
          {/* Rows */}
          <div className="max-h-[400px] overflow-y-auto">
            {visible.map((task) => {
              const dl = task.confirmed_deadline ?? task.desired_deadline ?? null
              const pStyle = PRIORITY_STYLES[task.priority] ?? PRIORITY_STYLES[3]
              const overdue = dl ? isOverdue(dl) : false
              const soon = dl ? daysUntilDeadline(dl) <= 3 && !overdue : false
              const dlDisplay = dl ? dl.slice(5).replace('-', '/') : '—'
              const hoursDisplay = task.estimated_hours
                ? `${task.actual_hours}/${task.estimated_hours}h`
                : task.actual_hours > 0 ? `${task.actual_hours}h` : '—'

              return (
                <Link
                  key={task.id}
                  href={`/tasks/${task.id}`}
                  className="flex items-center gap-[8px] px-[12px] py-[8px] border-b border-border2 last:border-b-0 no-underline hover:bg-surf2 transition-colors"
                >
                  <span className={`text-[9px] font-bold px-[5px] py-[1px] rounded ${pStyle} shrink-0 w-[32px] text-center`}>
                    P{task.priority}
                  </span>
                  <span className="text-[12px] text-text truncate flex-1">{task.title}</span>
                  <div className="w-[80px] shrink-0 hidden md:block">
                    <StatusChip status={task.status} />
                  </div>
                  <div className="w-[70px] shrink-0 flex items-center gap-[4px]">
                    <div className="w-[40px]">
                      <ProgressBar value={task.progress} />
                    </div>
                    <span className="text-[10px] text-text2">{task.progress}%</span>
                  </div>
                  <div className="w-[55px] text-right shrink-0">
                    <span className={`text-[11px] ${overdue ? 'text-danger font-semibold' : soon ? 'text-warn font-semibold' : 'text-text2'}`}>
                      {overdue || soon ? '⚠ ' : ''}{dlDisplay}
                    </span>
                  </div>
                  <span className="w-[60px] text-right shrink-0 text-[11px] text-text2 hidden md:block">
                    {hoursDisplay}
                  </span>
                </Link>
              )
            })}
          </div>
          {hasMore && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="w-full px-[12px] py-[8px] text-[11px] text-mint-dd hover:underline font-medium text-center border-t border-border2"
            >
              {expanded ? t('dashboard.activityFeed.showLess') : `${t('dashboard.activityFeed.showMore')} (${tasks.length - INITIAL_SHOW})`}
            </button>
          )}
        </>
      )}

      <div className="px-[12px] py-[8px] border-t border-border2 bg-surf2">
        <Link href="/tasks" className="text-[11px] text-mint-dd hover:underline font-medium">
          {t('mypage.viewAllTasks')} →
        </Link>
      </div>
    </div>
  )
}
