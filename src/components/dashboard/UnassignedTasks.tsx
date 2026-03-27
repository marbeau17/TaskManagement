'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { useTasks } from '@/hooks/useTasks'
import { formatDate } from '@/lib/utils'
import { useI18n } from '@/hooks/useI18n'
import type { TaskWithRelations } from '@/types/database'

function UnassignedItem({ task, t }: { task: TaskWithRelations; t: (key: string) => string }) {
  const clientName = task.client?.name ?? t('dashboard.unknown')
  const deadline = task.desired_deadline
    ? formatDate(task.desired_deadline)
    : t('dashboard.notSet')

  return (
    <Link
      href={`/tasks/${task.id}`}
      className="block px-[12px] py-[8px] border-b border-border2 last:border-b-0 hover:bg-surf2 transition-colors"
    >
      <div className="text-[12px] text-text font-medium truncate">{task.title}</div>
      <div className="flex items-center gap-[8px] mt-[3px]">
        <span className="text-[10px] text-text2 bg-surf2 px-[6px] py-[1px] rounded border border-border2">
          {clientName}
        </span>
        <span className="text-[10px] text-text3">
          {t('dashboard.desiredDeadline')}: {deadline}
        </span>
      </div>
    </Link>
  )
}

export function UnassignedTasks() {
  const { data: tasks, isLoading } = useTasks()
  const { t } = useI18n()

  const unassigned = useMemo(() => {
    if (!tasks) return []
    return tasks.filter((t) => t.status === 'waiting')
  }, [tasks])

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
        <h3 className="text-[13px] font-bold text-text">⏳ {t('dashboard.unassignedTitle')}</h3>
        <span className="text-[10px] bg-warn-bg text-warn px-[6px] py-[1px] rounded-full font-bold border border-warn-b">
          {unassigned.length}
        </span>
      </div>

      {/* Task list */}
      {unassigned.length > 0 ? (
        <div className="max-h-[200px] overflow-y-auto">
          {unassigned.map((task) => (
            <UnassignedItem key={task.id} task={task} t={t} />
          ))}
        </div>
      ) : (
        <div className="px-[12px] py-[16px] text-[12px] text-text3 text-center">
          {t('dashboard.noUnassignedTasks')}
        </div>
      )}

      {/* Footer action */}
      <div className="px-[12px] py-[8px] border-t border-border2 bg-surf2">
        <Link
          href="/tasks?status=waiting"
          className="text-[11px] text-mint-d font-semibold hover:text-mint-dd transition-colors"
        >
          {t('dashboard.assignAction')}
        </Link>
      </div>
    </div>
  )
}
