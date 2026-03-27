'use client'

import { useMemo } from 'react'
import { useTasks } from '@/hooks/useTasks'
import { useI18n } from '@/hooks/useI18n'
import { daysUntilDeadline, isOverdue } from '@/lib/date-utils'
import { formatDate } from '@/lib/utils'
import type { TaskWithRelations } from '@/types/database'

type AlertLevel = 'overdue' | 'today' | 'soon' | 'ok'

interface AlertRow {
  task: TaskWithRelations
  level: AlertLevel
  deadlineLabel: string
  daysLeft: number
}

function getAlertLevel(deadline: string): AlertLevel {
  if (isOverdue(deadline)) return 'overdue'
  const days = daysUntilDeadline(deadline)
  if (days === 0) return 'today'
  if (days <= 3) return 'soon'
  return 'ok'
}

function getDeadlineLabel(deadline: string, level: AlertLevel, t: (key: string) => string): string {
  if (level === 'overdue') {
    const d = new Date(deadline)
    const dateStr = `${(d.getMonth() + 1)}/${d.getDate()}`
    return t('deadline.overdue').replace('{date}', dateStr)
  }
  if (level === 'today') return t('deadline.today')
  return formatDate(deadline).slice(5) // M/DD format
}

const LEVEL_STYLES: Record<AlertLevel, { dot: string; tag: string; tagText: string }> = {
  overdue: {
    dot: 'bg-[#C05050] dark:bg-[#E07070]',
    tag: 'bg-danger-bg text-danger border-danger-b',
    tagText: 'text-danger',
  },
  today: {
    dot: 'bg-[#C8A030] dark:bg-[#E0C050]',
    tag: 'bg-warn-bg text-warn border-warn-b',
    tagText: 'text-warn',
  },
  soon: {
    dot: 'bg-[#C8A030] dark:bg-[#E0C050]',
    tag: 'bg-warn-bg text-warn border-warn-b',
    tagText: 'text-warn',
  },
  ok: {
    dot: 'bg-[#4A9482] dark:bg-[#6FB5A3]',
    tag: 'bg-ok-bg text-ok border-ok-b',
    tagText: 'text-ok',
  },
}

function AlertItem({ row }: { row: AlertRow }) {
  const style = LEVEL_STYLES[row.level]
  const { t } = useI18n()
  const assigneeName = row.task.assigned_user?.name ?? t('client.unassigned')

  return (
    <div className="flex items-center gap-[8px] px-[12px] py-[7px] border-b border-border2 last:border-b-0">
      {/* Colored dot */}
      <div className={`w-[7px] h-[7px] rounded-full shrink-0 ${style.dot}`} />

      {/* Task name */}
      <span className="text-[12px] text-text truncate flex-1">{row.task.title}</span>

      {/* Deadline tag */}
      <span
        className={`${style.tag} text-[10px] px-[8px] py-[1px] rounded-full border font-semibold whitespace-nowrap`}
      >
        {row.deadlineLabel}
      </span>

      {/* Assignee tag */}
      <span className="text-[10px] text-text2 bg-surf2 px-[8px] py-[1px] rounded-full border border-border2 whitespace-nowrap">
        {assigneeName}
      </span>
    </div>
  )
}

export function DeadlineAlerts() {
  const { data: tasks, isLoading } = useTasks()
  const { t } = useI18n()

  const alertRows = useMemo<AlertRow[]>(() => {
    if (!tasks) return []

    return tasks
      .filter((tk) => {
        if (tk.status === 'done') return false
        const deadline = tk.confirmed_deadline ?? tk.desired_deadline
        return !!deadline
      })
      .map((task) => {
        const deadline = (task.confirmed_deadline ?? task.desired_deadline)!
        const level = getAlertLevel(deadline)
        const deadlineLabel = getDeadlineLabel(deadline, level, t)
        const daysLeft = daysUntilDeadline(deadline)
        return { task, level, deadlineLabel, daysLeft }
      })
      .sort((a, b) => a.daysLeft - b.daysLeft)
  }, [tasks, t])

  if (isLoading) {
    return (
      <div className="bg-surface border border-border2 rounded-[10px] p-[16px] shadow">
        <div className="text-[12px] text-text3">{t('common.loading')}</div>
      </div>
    )
  }

  return (
    <div className="bg-surface border border-border2 rounded-[10px] shadow overflow-hidden">
      {/* Header */}
      <div className="px-[12px] py-[10px] border-b border-border2 bg-surf2 flex items-center gap-[6px]">
        <h3 className="text-[13px] font-bold text-text">{t('deadline.title')}</h3>
        {alertRows.filter((r) => r.level === 'overdue' || r.level === 'today').length > 0 && (
          <span className="text-[10px] bg-danger-bg text-danger px-[6px] py-[1px] rounded-full font-bold border border-danger-b">
            {alertRows.filter((r) => r.level === 'overdue' || r.level === 'today').length}
          </span>
        )}
      </div>

      {/* Rows */}
      {alertRows.length > 0 ? (
        <div className="max-h-[260px] overflow-y-auto">
          {alertRows.map((row) => (
            <AlertItem key={row.task.id} row={row} />
          ))}
        </div>
      ) : (
        <div className="px-[12px] py-[16px] text-[12px] text-text3 text-center">
          {t('deadline.noAlerts')}
        </div>
      )}
    </div>
  )
}
