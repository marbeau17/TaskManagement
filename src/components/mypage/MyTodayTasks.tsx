'use client'

import Link from 'next/link'
import { ProgressBar } from '@/components/shared'
import { useI18n } from '@/hooks/useI18n'
import { isOverdue, daysUntilDeadline } from '@/lib/date-utils'
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

function DeadlineLabel({ deadline }: { deadline: string | null }) {
  if (!deadline) return <span className="text-[11px] text-text3">—</span>
  const overdue = isOverdue(deadline)
  const days = daysUntilDeadline(deadline)
  const dateStr = deadline.slice(5).replace('-', '/')

  if (overdue) {
    return <span className="text-[11px] font-semibold text-danger">⚠ {dateStr}</span>
  }
  if (days <= 3) {
    return <span className="text-[11px] font-semibold text-warn">⚠ {dateStr}</span>
  }
  return <span className="text-[11px] text-text2">{dateStr}</span>
}

export function MyTodayTasks({ tasks, isLoading }: Props) {
  const { t } = useI18n()

  if (isLoading) {
    return (
      <div className="bg-surface border border-border2 rounded-[10px] shadow overflow-hidden" data-testid="mypage-today-tasks">
        <div className="px-[12px] py-[10px] border-b border-border2 bg-surf2">
          <h3 className="text-[13px] font-bold text-text">{t('mypage.todayTasks.title')}</h3>
        </div>
        <div className="p-[12px] space-y-[8px] animate-pulse">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-[32px] bg-surf2 rounded" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-surface border border-border2 rounded-[10px] shadow overflow-hidden" data-testid="mypage-today-tasks">
      <div className="px-[12px] py-[10px] border-b border-border2 bg-surf2 flex items-center justify-between">
        <h3 className="text-[13px] font-bold text-text">{t('mypage.todayTasks.title')}</h3>
        <span className="text-[10px] bg-mint-dd/10 text-mint-dd px-[6px] py-[1px] rounded-full font-bold">
          {tasks.length}
        </span>
      </div>

      {tasks.length === 0 ? (
        <div className="px-[12px] py-[16px] text-[12px] text-text3 text-center">
          {t('mypage.todayTasks.empty')}
        </div>
      ) : (
        <div className="max-h-[300px] overflow-y-auto">
          {tasks.map((task) => {
            const dl = task.confirmed_deadline ?? task.desired_deadline ?? null
            const pStyle = PRIORITY_STYLES[task.priority] ?? PRIORITY_STYLES[3]
            return (
              <Link
                key={task.id}
                href={`/tasks/${task.id}`}
                className="flex items-center gap-[8px] px-[12px] py-[8px] border-b border-border2 last:border-b-0 no-underline hover:bg-surf2 transition-colors"
              >
                <span className={`text-[9px] font-bold px-[5px] py-[1px] rounded ${pStyle} shrink-0`}>
                  P{task.priority}
                </span>
                <span className="text-[12px] text-text truncate flex-1">{task.title}</span>
                <div className="w-[50px] shrink-0">
                  <ProgressBar value={task.progress} />
                </div>
                <span className="text-[10px] text-text2 w-[28px] text-right shrink-0">{task.progress}%</span>
                <div className="w-[55px] text-right shrink-0">
                  <DeadlineLabel deadline={dl} />
                </div>
              </Link>
            )
          })}
        </div>
      )}

      <div className="px-[12px] py-[8px] border-t border-border2 bg-surf2">
        <Link href="/tasks" className="text-[11px] text-mint-dd hover:underline font-medium">
          {t('mypage.viewAllTasks')} →
        </Link>
      </div>
    </div>
  )
}
