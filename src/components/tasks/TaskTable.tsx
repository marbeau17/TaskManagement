'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import type { TaskWithRelations } from '@/types/database'
import { Avatar, ProgressBar, StatusChip } from '@/components/shared'
import { formatDate, formatHours } from '@/lib/utils'
import { isOverdue } from '@/lib/date-utils'
import { isToday } from 'date-fns'

interface TaskTableProps {
  tasks: TaskWithRelations[]
  selectedIds?: Set<string>
  onSelectionChange?: (ids: Set<string>) => void
}

const COLUMNS = [
  'クライアント',
  'タスク名',
  '担当クリエイター',
  '進捗',
  '確定納期',
  '見積',
  '実績',
  'ステータス',
] as const

const PAGE_SIZE = 20

export function TaskTable({ tasks, selectedIds, onSelectionChange }: TaskTableProps) {
  const router = useRouter()
  const [currentPage, setCurrentPage] = useState(1)

  const selectable = !!onSelectionChange
  const selected = selectedIds ?? new Set<string>()

  const totalPages = Math.max(1, Math.ceil(tasks.length / PAGE_SIZE))

  // Reset to page 1 if tasks change and current page is out of bounds
  const safePage = currentPage > totalPages ? 1 : currentPage

  const pagedTasks = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE
    return tasks.slice(start, start + PAGE_SIZE)
  }, [tasks, safePage])

  // Reset page when tasks array identity changes (filters applied)
  const [prevTasksLen, setPrevTasksLen] = useState(tasks.length)
  if (tasks.length !== prevTasksLen) {
    setPrevTasksLen(tasks.length)
    if (currentPage !== 1) setCurrentPage(1)
  }

  const allPageSelected = pagedTasks.length > 0 && pagedTasks.every((t) => selected.has(t.id))
  const somePageSelected = pagedTasks.some((t) => selected.has(t.id))

  const handleSelectAll = () => {
    if (!onSelectionChange) return
    const next = new Set(selected)
    if (allPageSelected) {
      // Deselect all on current page
      pagedTasks.forEach((t) => next.delete(t.id))
    } else {
      // Select all on current page
      pagedTasks.forEach((t) => next.add(t.id))
    }
    onSelectionChange(next)
  }

  const handleSelectOne = (taskId: string) => {
    if (!onSelectionChange) return
    const next = new Set(selected)
    if (next.has(taskId)) {
      next.delete(taskId)
    } else {
      next.add(taskId)
    }
    onSelectionChange(next)
  }

  return (
    <div>
      {/* Mobile card view */}
      <div className="md:hidden">
        {pagedTasks.length === 0 && (
          <div className="px-[12px] py-[32px] text-center text-text3 text-[13px]">
            タスクが見つかりませんでした
          </div>
        )}
        <div className="flex flex-col gap-[8px] p-[12px]">
          {pagedTasks.map((task) => {
            const deadline = task.confirmed_deadline ?? task.desired_deadline
            const taskOverdue =
              deadline && task.status !== 'done' && isOverdue(deadline)
            const taskDueToday =
              deadline && task.status !== 'done' && isToday(new Date(deadline))

            return (
              <div
                key={task.id}
                onClick={() => router.push(`/tasks/${task.id}`)}
                className={`
                  rounded-[8px] border border-wf-border p-[12px] cursor-pointer
                  hover:bg-surf2/50 transition-colors
                  ${taskOverdue ? 'bg-warn-bg' : 'bg-surface'}
                  ${selected.has(task.id) ? 'ring-2 ring-mint-ll' : ''}
                `}
              >
                <div className="flex items-center justify-between mb-[6px]">
                  <span className="text-[11px] font-bold text-text2">{task.client.name}</span>
                  <StatusChip status={task.status} size="sm" />
                </div>
                <div className="text-[13px] font-bold text-text mb-[6px] leading-tight">
                  {task.title}
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-[6px]">
                    {task.assignees && task.assignees.length > 0 ? (
                      <div className="flex items-center -space-x-2">
                        {task.assignees.slice(0, 3).map((a) =>
                          a.user ? (
                            <Avatar
                              key={a.id}
                              name_short={a.user.name_short}
                              color={a.user.avatar_color}
                              size="sm"
                            />
                          ) : null
                        )}
                      </div>
                    ) : task.assigned_user ? (
                      <Avatar
                        name_short={task.assigned_user.name_short}
                        color={task.assigned_user.avatar_color}
                        size="sm"
                      />
                    ) : (
                      <span className="text-[11px] italic text-warn">未アサイン</span>
                    )}
                  </div>
                  {deadline ? (
                    <span
                      className={`text-[11px] ${
                        taskOverdue
                          ? 'text-danger font-semibold'
                          : taskDueToday
                            ? 'text-warn font-semibold'
                            : 'text-text2'
                      }`}
                    >
                      {taskOverdue && '🚨 '}
                      {taskDueToday && !taskOverdue && '⚠ '}
                      {formatDate(deadline)}
                    </span>
                  ) : (
                    <span className="text-[11px] text-text3">-</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Desktop table view */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-wf-border">
              {selectable && (
                <th className="px-[8px] py-[10px] w-[40px]">
                  <input
                    type="checkbox"
                    checked={allPageSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = somePageSelected && !allPageSelected
                    }}
                    onChange={handleSelectAll}
                    className="w-[14px] h-[14px] rounded accent-[#2A9D8F] cursor-pointer"
                  />
                </th>
              )}
              {COLUMNS.map((col) => (
                <th
                  key={col}
                  className="px-[12px] py-[10px] text-[11px] font-semibold text-text2 whitespace-nowrap"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pagedTasks.length === 0 && (
              <tr>
                <td
                  colSpan={COLUMNS.length + (selectable ? 1 : 0)}
                  className="px-[12px] py-[32px] text-center text-text3 text-[13px]"
                >
                  タスクが見つかりませんでした
                </td>
              </tr>
            )}
            {pagedTasks.map((task) => {
              const deadline = task.confirmed_deadline ?? task.desired_deadline
              const taskOverdue =
                deadline && task.status !== 'done' && isOverdue(deadline)
              const taskDueToday =
                deadline &&
                task.status !== 'done' &&
                isToday(new Date(deadline))

              return (
                <tr
                  key={task.id}
                  onClick={() => router.push(`/tasks/${task.id}`)}
                  className={`
                    border-b border-wf-border cursor-pointer
                    hover:bg-surf2/50 transition-colors
                    ${taskOverdue ? 'bg-warn-bg' : ''}
                    ${selected.has(task.id) ? 'bg-mint-ll/40' : ''}
                  `}
                >
                  {selectable && (
                    <td className="px-[8px] py-[10px]">
                      <input
                        type="checkbox"
                        checked={selected.has(task.id)}
                        onChange={(e) => {
                          e.stopPropagation()
                          handleSelectOne(task.id)
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-[14px] h-[14px] rounded accent-[#2A9D8F] cursor-pointer"
                      />
                    </td>
                  )}

                  {/* Client */}
                  <td className="px-[12px] py-[10px]">
                    <span className="text-[11.5px] font-bold text-text whitespace-nowrap">
                      {task.client.name}
                    </span>
                  </td>

                  {/* Task name */}
                  <td className="px-[12px] py-[10px] min-w-[180px]">
                    <div className="text-[12.5px] font-bold text-text leading-tight">
                      {task.title}
                    </div>
                    {task.description && (
                      <div className="text-[11px] text-text3 mt-[2px] line-clamp-1">
                        {task.description}
                      </div>
                    )}
                  </td>

                  {/* Assignee(s) */}
                  <td className="px-[12px] py-[10px]">
                    {task.assignees && task.assignees.length > 0 ? (
                      <div className="flex items-center gap-[6px]">
                        <div className="flex items-center -space-x-2">
                          {task.assignees.slice(0, 3).map((a) =>
                            a.user ? (
                              <Avatar
                                key={a.id}
                                name_short={a.user.name_short}
                                color={a.user.avatar_color}
                                size="sm"
                              />
                            ) : null
                          )}
                        </div>
                        {task.assignees.length <= 2 ? (
                          <span className="text-[11.5px] text-text whitespace-nowrap">
                            {task.assignees
                              .map((a) => a.user?.name)
                              .filter(Boolean)
                              .join(', ')}
                          </span>
                        ) : (
                          <span className="text-[11.5px] text-text whitespace-nowrap">
                            {task.assignees[0]?.user?.name} 他{task.assignees.length - 1}名
                          </span>
                        )}
                      </div>
                    ) : task.assigned_user ? (
                      <div className="flex items-center gap-[6px]">
                        <Avatar
                          name_short={task.assigned_user.name_short}
                          color={task.assigned_user.avatar_color}
                          size="sm"
                        />
                        <span className="text-[11.5px] text-text whitespace-nowrap">
                          {task.assigned_user.name}
                        </span>
                      </div>
                    ) : (
                      <span className="text-[11.5px] italic text-warn">
                        未アサイン
                      </span>
                    )}
                  </td>

                  {/* Progress */}
                  <td className="px-[12px] py-[10px] min-w-[100px]">
                    <div className="flex items-center gap-[8px]">
                      <span className="text-[11px] font-semibold text-text2 w-[32px] text-right">
                        {task.progress}%
                      </span>
                      <div className="flex-1 min-w-[50px]">
                        <ProgressBar value={task.progress} height="sm" />
                      </div>
                    </div>
                  </td>

                  {/* Deadline */}
                  <td className="px-[12px] py-[10px]">
                    {deadline ? (
                      <span
                        className={`text-[11.5px] whitespace-nowrap ${
                          taskOverdue
                            ? 'text-danger font-semibold'
                            : taskDueToday
                              ? 'text-warn font-semibold'
                              : 'text-text'
                        }`}
                      >
                        {taskOverdue && '🚨 '}
                        {taskDueToday && !taskOverdue && '⚠ '}
                        {formatDate(deadline)}
                      </span>
                    ) : (
                      <span className="text-[11.5px] text-text3">-</span>
                    )}
                  </td>

                  {/* Estimate */}
                  <td className="px-[12px] py-[10px]">
                    <span className="text-[11.5px] text-text whitespace-nowrap">
                      {task.estimated_hours != null
                        ? formatHours(task.estimated_hours)
                        : '-'}
                    </span>
                  </td>

                  {/* Actual */}
                  <td className="px-[12px] py-[10px]">
                    <div className="flex items-center gap-[4px]">
                      <span className="text-[11.5px] text-text whitespace-nowrap">
                        {formatHours(task.actual_hours)}
                      </span>
                      {task.actual_hours > 0 && (
                        <span className="text-[9px] px-[5px] py-[1px] rounded-full bg-[#FFF8E0] dark:bg-[#3D3520] text-[#C8A030] dark:text-[#E0C050] font-semibold border border-[#F0E0A0] dark:border-[#7A6010] whitespace-nowrap">
                          手入力済み
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Status */}
                  <td className="px-[12px] py-[10px]">
                    <StatusChip status={task.status} size="sm" />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-[12px] py-[12px] border-t border-wf-border">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={safePage <= 1}
            className="
              h-[30px] px-[12px] rounded-[6px] text-[12px] font-semibold
              border border-wf-border text-text2
              hover:bg-surf2 transition-colors
              disabled:opacity-40 disabled:cursor-not-allowed
            "
          >
            前へ
          </button>
          <span className="text-[12px] text-text2">
            {safePage} / {totalPages} ページ
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage >= totalPages}
            className="
              h-[30px] px-[12px] rounded-[6px] text-[12px] font-semibold
              border border-wf-border text-text2
              hover:bg-surf2 transition-colors
              disabled:opacity-40 disabled:cursor-not-allowed
            "
          >
            次へ
          </button>
        </div>
      )}
    </div>
  )
}
