'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { Avatar, StatusChip, ProgressBar } from '@/components/shared'
import { useTasks } from '@/hooks/useTasks'
import { useMembers } from '@/hooks/useMembers'
import { useI18n } from '@/hooks/useI18n'
import { formatDate, formatHours } from '@/lib/utils'
import type { TaskWithRelations, Client, User } from '@/types/database'

// ---------------------------------------------------------------------------
// Client summary card (top section)
// ---------------------------------------------------------------------------

interface ClientCardData {
  client: Client
  tasks: TaskWithRelations[]
  activeTasks: TaskWithRelations[]
  doneTasks: TaskWithRelations[]
  totalEstimated: number
  members: User[]
  progressPercent: number
}

function ClientCard({ data }: { data: ClientCardData }) {
  const { client, tasks, activeTasks, doneTasks, totalEstimated, members, progressPercent } = data
  const { t } = useI18n()

  return (
    <div className="bg-surface border border-border2 rounded-[10px] p-[14px] shadow">
      <div className="flex items-center justify-between mb-[8px]">
        <h4 className="text-[13px] font-bold text-text truncate">{client.name}</h4>
        <span className="text-[10px] text-text2 bg-surf2 px-[6px] py-[1px] rounded-full border border-border2">
          {t('client.taskCount').replace('{count}', String(tasks.length))}
        </span>
      </div>

      {activeTasks.length > 0 && (
        <span className="text-[9px] bg-info-bg text-info px-[6px] py-[1px] rounded-full border border-info-b font-semibold inline-block mb-[8px]">
          {t('client.inProgress').replace('{count}', String(activeTasks.length))}
        </span>
      )}

      <div className="mb-[6px]">
        <ProgressBar value={progressPercent} height="sm" />
      </div>

      <div className="flex items-center justify-between mb-[8px]">
        <span className="text-[10px] text-text2">
          {t('client.doneCount').replace('{done}', String(doneTasks.length)).replace('{total}', String(tasks.length))}
        </span>
        <span className="text-[10px] text-text3">
          {t('client.estimate').replace('{hours}', formatHours(totalEstimated))}
        </span>
      </div>

      {/* Member avatars */}
      <div className="flex items-center gap-[-4px]">
        {members.slice(0, 4).map((member) => (
          <div key={member.id} className="ml-[-4px] first:ml-0">
            <Avatar
              name_short={member.name_short}
              color={member.avatar_color}
              size="sm"
            />
          </div>
        ))}
        {members.length > 4 && (
          <span className="text-[9px] text-text3 ml-[4px]">
            +{members.length - 4}
          </span>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Client task table row (bottom section)
// ---------------------------------------------------------------------------

function ClientTaskRow({ task }: { task: TaskWithRelations }) {
  const deadline = task.confirmed_deadline ?? task.desired_deadline
  const { t } = useI18n()

  return (
    <Link
      href={`/tasks/${task.id}`}
      className="grid grid-cols-[1fr_1.2fr_100px_80px_80px_70px_90px] items-center gap-[8px] px-[12px] py-[7px] border-b border-border2 hover:bg-surf2 transition-colors cursor-pointer"
    >
      {/* クライアント */}
      <span className="text-[11px] text-text2 truncate">{task.client?.name ?? '—'}</span>

      {/* タスク名 */}
      <span className="text-[12px] text-text truncate font-medium">{task.title}</span>

      {/* 担当 */}
      <div className="flex items-center gap-[4px]">
        {task.assigned_user ? (
          <>
            <Avatar
              name_short={task.assigned_user.name_short}
              color={task.assigned_user.avatar_color}
              size="sm"
            />
            <span className="text-[11px] text-text2 truncate">
              {task.assigned_user.name}
            </span>
          </>
        ) : (
          <span className="text-[11px] text-text3">{t('client.unassigned')}</span>
        )}
      </div>

      {/* 進捗 */}
      <div className="flex items-center gap-[4px]">
        <div className="flex-1">
          <ProgressBar value={task.progress} height="sm" />
        </div>
        <span className="text-[10px] text-text2 w-[28px] text-right">{task.progress}%</span>
      </div>

      {/* 納期 */}
      <span className="text-[11px] text-text2">
        {deadline ? formatDate(deadline).slice(5) : '—'}
      </span>

      {/* 見積 */}
      <span className="text-[11px] text-text2">
        {task.estimated_hours != null ? formatHours(task.estimated_hours) : '—'}
      </span>

      {/* ステータス */}
      <StatusChip status={task.status} size="sm" />
    </Link>
  )
}

// ---------------------------------------------------------------------------
// Main ClientView component
// ---------------------------------------------------------------------------

export function ClientView() {
  const { data: tasks, isLoading: tasksLoading } = useTasks()
  const { data: members, isLoading: membersLoading } = useMembers()

  const isLoading = tasksLoading || membersLoading

  // Group tasks by client
  const clientGroups = useMemo(() => {
    if (!tasks) return []

    const grouped = new Map<string, { client: Client; tasks: TaskWithRelations[] }>()

    for (const task of tasks) {
      if (!task.client) continue
      const key = task.client.id
      if (!grouped.has(key)) {
        grouped.set(key, { client: task.client, tasks: [] })
      }
      grouped.get(key)!.tasks.push(task)
    }

    return Array.from(grouped.values()).map((group) => {
      const activeTasks = group.tasks.filter(
        (t) => t.status === 'in_progress' || t.status === 'todo'
      )
      const doneTasks = group.tasks.filter((t) => t.status === 'done')
      const totalEstimated = group.tasks.reduce(
        (sum, t) => sum + (t.estimated_hours ?? 0),
        0
      )
      const progressPercent =
        group.tasks.length > 0
          ? Math.round((doneTasks.length / group.tasks.length) * 100)
          : 0

      // Unique assigned members
      const memberSet = new Map<string, User>()
      for (const t of group.tasks) {
        if (t.assigned_user && !memberSet.has(t.assigned_user.id)) {
          memberSet.set(t.assigned_user.id, t.assigned_user)
        }
      }

      return {
        client: group.client,
        tasks: group.tasks,
        activeTasks,
        doneTasks,
        totalEstimated,
        members: Array.from(memberSet.values()),
        progressPercent,
      } satisfies ClientCardData
    })
  }, [tasks])

  // All tasks sorted by client for the table
  const allTasks = useMemo(() => {
    if (!tasks) return []
    return [...tasks].sort((a, b) => {
      const ca = a.client?.name ?? ''
      const cb = b.client?.name ?? ''
      return ca.localeCompare(cb, 'ja')
    })
  }, [tasks])

  const { t } = useI18n()

  if (isLoading) {
    return (
      <div className="p-[16px] text-[12px] text-text3">{t('common.loading')}</div>
    )
  }

  return (
    <div className="flex flex-col gap-[16px]">
      {/* Top: Client summary cards */}
      <div className="grid grid-cols-3 gap-[12px]">
        {clientGroups.slice(0, 6).map((data) => (
          <ClientCard key={data.client.id} data={data} />
        ))}
      </div>

      {/* Bottom: All tasks table */}
      <div className="bg-surface border border-border2 rounded-[10px] shadow overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-[1fr_1.2fr_100px_80px_80px_70px_90px] items-center gap-[8px] px-[12px] py-[7px] border-b border-border2 bg-surf2">
          <span className="text-[10px] text-text3 font-semibold">{t('client.headerClient')}</span>
          <span className="text-[10px] text-text3 font-semibold">{t('client.headerTaskName')}</span>
          <span className="text-[10px] text-text3 font-semibold">{t('client.headerAssignee')}</span>
          <span className="text-[10px] text-text3 font-semibold">{t('client.headerProgress')}</span>
          <span className="text-[10px] text-text3 font-semibold">{t('client.headerDeadline')}</span>
          <span className="text-[10px] text-text3 font-semibold">{t('client.headerEstimate')}</span>
          <span className="text-[10px] text-text3 font-semibold">{t('client.headerStatus')}</span>
        </div>

        {/* Table rows */}
        {allTasks.length > 0 ? (
          <div className="max-h-[400px] overflow-y-auto">
            {allTasks.map((task) => (
              <ClientTaskRow key={task.id} task={task} />
            ))}
          </div>
        ) : (
          <div className="px-[12px] py-[16px] text-[12px] text-text3 text-center">
            {t('client.noTasks')}
          </div>
        )}
      </div>
    </div>
  )
}
