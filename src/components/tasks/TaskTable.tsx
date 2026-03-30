'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { TaskWithRelations } from '@/types/database'
import { Avatar, Pagination, ProgressBar, StatusChip } from '@/components/shared'
import { formatDate, formatHours } from '@/lib/utils'
import { isOverdue } from '@/lib/date-utils'
import { isToday } from 'date-fns'
import { useSubtasks, useBulkDeleteTasks } from '@/hooks/useTasks'
import { useI18n } from '@/hooks/useI18n'
import { usePermission } from '@/hooks/usePermission'

interface TaskTableProps {
  tasks: TaskWithRelations[]
  selectedIds?: Set<string>
  onSelectionChange?: (ids: Set<string>) => void
}

const COLUMN_KEYS = [
  'tasks.col.wbs',
  'tasks.col.client',
  'tasks.col.taskName',
  'tasks.col.assignee',
  'tasks.col.progress',
  'tasks.col.deadline',
  'tasks.col.estimate',
  'tasks.col.actual',
  'tasks.col.status',
] as const


/** Inline component to render subtask rows when a parent is expanded */
function SubtaskRows({
  parentId,
  selected,
  selectable,
  onSelectOne,
}: {
  parentId: string
  selected: Set<string>
  selectable: boolean
  onSelectOne: (id: string) => void
}) {
  const router = useRouter()
  const { t } = useI18n()
  const { data: subtasks } = useSubtasks(parentId)

  if (!subtasks || subtasks.length === 0) return null

  return (
    <>
      {subtasks.map((task) => {
        const deadline = task.confirmed_deadline ?? task.desired_deadline
        const taskOverdue = deadline && task.status !== 'done' && isOverdue(deadline)
        const taskDueToday = deadline && task.status !== 'done' && isToday(new Date(deadline))

        return (
          <tr
            key={task.id}
            onClick={() => router.push(`/tasks/${task.id}`)}
            className={`
              border-b border-wf-border cursor-pointer
              hover:bg-surf2/50 transition-colors bg-surf2/30
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
                    onSelectOne(task.id)
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="w-[14px] h-[14px] rounded accent-[#2A9D8F] cursor-pointer"
                />
              </td>
            )}

            {/* WBS */}
            <td className="px-[12px] py-[10px]">
              <span className="text-[10.5px] font-mono text-text3">
                {task.wbs_code || ''}
              </span>
            </td>

            {/* Client */}
            <td className="px-[12px] py-[10px]">
              <span className="text-[11.5px] font-bold text-text whitespace-nowrap">
                {task.client.name}
              </span>
            </td>

            {/* Task name (indented) */}
            <td className="px-[12px] py-[10px] min-w-[180px]">
              <div className="text-[12.5px] font-bold text-text leading-tight pl-[16px]">
                <span className="text-text3 mr-[4px]">{'\u2514'}</span>
                {task.title}
              </div>
              {task.description && (
                <div className="text-[11px] text-text3 mt-[2px] line-clamp-1 pl-[16px]">
                  {task.description}
                </div>
              )}
            </td>

            {/* Assignee */}
            <td className="px-[12px] py-[10px]">
              {task.assigned_user ? (
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
                <span className="text-[11.5px] italic text-warn">{t('tasks.unassigned')}</span>
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
                  {formatDate(deadline)}
                </span>
              ) : (
                <span className="text-[11.5px] text-text3">-</span>
              )}
            </td>

            {/* Estimate */}
            <td className="px-[12px] py-[10px]">
              <span className="text-[11.5px] text-text whitespace-nowrap">
                {task.estimated_hours != null ? formatHours(task.estimated_hours) : '-'}
              </span>
            </td>

            {/* Actual */}
            <td className="px-[12px] py-[10px]">
              <span className="text-[11.5px] text-text whitespace-nowrap">
                {formatHours(task.actual_hours)}
              </span>
            </td>

            {/* Status */}
            <td className="px-[12px] py-[10px]">
              <StatusChip status={task.status} size="sm" />
            </td>
          </tr>
        )
      })}
    </>
  )
}

export function TaskTable({ tasks, selectedIds, onSelectionChange }: TaskTableProps) {
  const { t } = useI18n()
  const router = useRouter()
  const { can } = usePermission()
  const deleteTask = useBulkDeleteTasks()
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  const toggleExpand = useCallback((taskId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(taskId)) {
        next.delete(taskId)
      } else {
        next.add(taskId)
      }
      return next
    })
  }, [])

  // Identify which tasks have children in the current dataset
  const parentIds = useMemo(() => {
    const childParentIds = new Set<string>()
    tasks.forEach((t) => {
      if (t.parent_task_id) childParentIds.add(t.parent_task_id)
    })
    return childParentIds
  }, [tasks])

  // Filter out subtasks from top-level listing (only show root tasks)
  const rootTasks = useMemo(() => {
    return tasks.filter((t) => !t.parent_task_id)
  }, [tasks])

  const selectable = !!onSelectionChange
  const selected = selectedIds ?? new Set<string>()

  const totalPages = pageSize === 0 ? 1 : Math.max(1, Math.ceil(rootTasks.length / pageSize))

  // Reset to page 1 if tasks change and current page is out of bounds
  const safePage = currentPage > totalPages ? 1 : currentPage

  const pagedTasks = useMemo(() => {
    if (pageSize === 0) return rootTasks
    const start = (safePage - 1) * pageSize
    return rootTasks.slice(start, start + pageSize)
  }, [rootTasks, safePage, pageSize])

  // Reset page when tasks array identity changes (filters applied)
  const [prevTasksLen, setPrevTasksLen] = useState(rootTasks.length)
  if (rootTasks.length !== prevTasksLen) {
    setPrevTasksLen(rootTasks.length)
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
      {/* Pagination */}
      <Pagination
        page={safePage}
        pageSize={pageSize}
        totalCount={rootTasks.length}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
      />

      {/* Mobile card view */}
      <div className="md:hidden">
        {pagedTasks.length === 0 && (
          <div className="px-[12px] py-[32px] text-center text-text3 text-[13px]">
            {t('tasks.noTasks')}
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
                      <span className="text-[11px] italic text-warn">{t('tasks.unassigned')}</span>
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
              {COLUMN_KEYS.map((key) => (
                <th
                  key={key}
                  className="px-[12px] py-[10px] text-[11px] font-semibold text-text2 whitespace-nowrap"
                >
                  {t(key)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pagedTasks.length === 0 && (
              <tr>
                <td
                  colSpan={COLUMN_KEYS.length + (selectable ? 1 : 0)}
                  className="px-[12px] py-[32px] text-center text-text3 text-[13px]"
                >
                  {t('tasks.noTasks')}
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
              const hasChildren = parentIds.has(task.id)
              const isExpanded = expandedIds.has(task.id)

              return (
                <React.Fragment key={task.id}>
                <tr
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

                  {/* WBS */}
                  <td className="px-[12px] py-[10px]">
                    <div className="flex items-center gap-[4px]">
                      {hasChildren && (
                        <button
                          type="button"
                          onClick={(e) => toggleExpand(task.id, e)}
                          className="text-[11px] text-text2 hover:text-mint w-[16px] h-[16px] flex items-center justify-center rounded hover:bg-surf2 transition-colors shrink-0"
                        >
                          {isExpanded ? '\u25BC' : '\u25B6'}
                        </button>
                      )}
                      {task.wbs_code && (
                        <span className="text-[10.5px] font-mono text-text3 whitespace-nowrap">
                          {task.wbs_code}
                        </span>
                      )}
                    </div>
                  </td>

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
                            {task.assignees[0]?.user?.name} {t('tasks.othersCount').replace('{count}', String(task.assignees.length - 1))}
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
                        {t('tasks.unassigned')}
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
                          {t('tasks.manualEntry')}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Status */}
                  <td className="px-[12px] py-[10px]">
                    <StatusChip status={task.status} size="sm" />
                  </td>
                </tr>

                {/* Expanded subtask rows */}
                {isExpanded && (
                  <SubtaskRows
                    parentId={task.id}
                    selected={selected}
                    selectable={selectable}
                    onSelectOne={handleSelectOne}
                  />
                )}
                </React.Fragment>
              )
            })}
          </tbody>
        </table>
      </div>

    </div>
  )
}
