'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTasks } from '@/hooks/useTasks'
import { useI18n } from '@/hooks/useI18n'
import { Avatar } from '@/components/shared'
import { isOverdue, daysUntilDeadline } from '@/lib/date-utils'
import { formatDate } from '@/lib/utils'
import { endOfWeek, endOfMonth } from 'date-fns'

type PeriodTab = 'week' | 'month' | 'all'

function getDeadlineStyle(deadline: string) {
  if (isOverdue(deadline)) return { badge: 'bg-danger-bg text-danger border-danger-b', dot: 'bg-red-500' }
  const days = daysUntilDeadline(deadline)
  if (days <= 3) return { badge: 'bg-warn-bg text-warn border-warn-b', dot: 'bg-amber-500' }
  return { badge: 'bg-surf2 text-text2 border-wf-border', dot: 'bg-emerald-500' }
}

export function UpcomingTasks() {
  const { t } = useI18n()
  const router = useRouter()
  const { data: tasks } = useTasks()
  const [tab, setTab] = useState<PeriodTab>('week')

  const now = new Date()
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 })
  const monthEnd = endOfMonth(now)

  const { weekTasks, monthTasks, allTasks } = useMemo(() => {
    if (!tasks) return { weekTasks: [], monthTasks: [], allTasks: [] }

    const activeTasks = tasks
      .filter((t) => t.status !== 'done' && t.status !== 'rejected')
      .map((task) => {
        const deadline = task.confirmed_deadline ?? task.desired_deadline
        return { task, deadline }
      })
      .filter((t) => t.deadline)
      .sort((a, b) => a.deadline!.localeCompare(b.deadline!))

    const week = activeTasks.filter((t) => new Date(t.deadline!) <= weekEnd)
    const month = activeTasks.filter((t) => new Date(t.deadline!) <= monthEnd)
    const all = activeTasks

    return { weekTasks: week, monthTasks: month, allTasks: all }
  }, [tasks, weekEnd, monthEnd])

  const currentList = tab === 'week' ? weekTasks : tab === 'month' ? monthTasks : allTasks
  const overdueCount = currentList.filter((t) => isOverdue(t.deadline!)).length

  const tabs: { id: PeriodTab; label: string; count: number }[] = [
    { id: 'week', label: t('upcoming.thisWeek'), count: weekTasks.length },
    { id: 'month', label: t('upcoming.thisMonth'), count: monthTasks.length },
    { id: 'all', label: t('upcoming.all'), count: allTasks.length },
  ]

  return (
    <div className="bg-surface border border-border2 rounded-[10px] shadow overflow-hidden">
      {/* Header with tabs */}
      <div className="px-[12px] py-[8px] border-b border-border2 bg-surf2">
        <div className="flex items-center justify-between mb-[6px]">
          <h3 className="text-[13px] font-bold text-text">{t('upcoming.title')}</h3>
          {overdueCount > 0 && (
            <span className="text-[10px] bg-danger-bg text-danger px-[6px] py-[1px] rounded-full font-bold border border-danger-b">
              {overdueCount} {t('upcoming.overdue')}
            </span>
          )}
        </div>
        <div className="flex gap-[4px]">
          {tabs.map((tb) => (
            <button
              key={tb.id}
              onClick={() => setTab(tb.id)}
              className={`px-[10px] py-[4px] rounded-[5px] text-[11px] font-semibold transition-colors ${
                tab === tb.id
                  ? 'bg-mint text-white'
                  : 'text-text2 hover:bg-surface border border-wf-border'
              }`}
            >
              {tb.label} ({tb.count})
            </button>
          ))}
        </div>
      </div>

      {/* Task list */}
      <div className="max-h-[320px] overflow-y-auto">
        {currentList.length === 0 ? (
          <div className="px-[12px] py-[20px] text-[12px] text-text3 text-center">
            {t('upcoming.noTasks')}
          </div>
        ) : (
          currentList.map(({ task, deadline }) => {
            const style = getDeadlineStyle(deadline!)
            const overdue = isOverdue(deadline!)
            return (
              <div
                key={task.id}
                onClick={() => router.push(`/tasks/${task.id}`)}
                className={`flex items-center gap-[8px] px-[12px] py-[7px] border-b border-border2 last:border-b-0 cursor-pointer hover:bg-surf2/50 transition-colors ${overdue ? 'bg-danger-bg/30' : ''}`}
              >
                <div className={`w-[6px] h-[6px] rounded-full shrink-0 ${style.dot}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] text-text font-medium truncate">{task.title}</div>
                  <div className="text-[10px] text-text3 truncate">{task.client.name}</div>
                </div>
                {task.assigned_user ? (
                  <Avatar name_short={task.assigned_user.name_short} color={task.assigned_user.avatar_color} size="sm" />
                ) : (
                  <span className="text-[9px] text-warn italic">{t('tasks.unassigned')}</span>
                )}
                <span className={`${style.badge} text-[10px] px-[7px] py-[1px] rounded-full border font-semibold whitespace-nowrap`}>
                  {overdue ? '🚨 ' : ''}{formatDate(deadline!).slice(5)}
                </span>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
