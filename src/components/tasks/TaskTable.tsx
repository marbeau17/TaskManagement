'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { TaskWithRelations } from '@/types/database'
import { Avatar, Pagination, ProgressBar, StatusChip } from '@/components/shared'
import { formatDate, formatHours } from '@/lib/utils'
import { isOverdue } from '@/lib/date-utils'
import { isToday } from 'date-fns'
import { useSubtasks, useBulkDeleteTasks, useUpdateTask } from '@/hooks/useTasks'
import { useClients } from '@/hooks/useClients'
import { useMembers } from '@/hooks/useMembers'
import { useI18n } from '@/hooks/useI18n'
import { usePermission } from '@/hooks/usePermission'
import { getStatusLabels } from '@/lib/constants'

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
  'tasks.col.status',
  'tasks.col.priority',
  'tasks.col.progress',
  'tasks.col.deadline',
  'tasks.col.estimate',
  'tasks.col.actual',
] as const

type SortField = 'wbs' | 'client' | 'title' | 'assignee' | 'progress' | 'deadline' | 'estimate' | 'actual' | 'status' | 'priority'
type SortDir = 'asc' | 'desc'

const SORT_FIELDS: SortField[] = ['wbs', 'client', 'title', 'assignee', 'status', 'priority', 'progress', 'deadline', 'estimate', 'actual']


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

            {/* Status */}
            <td className="px-[12px] py-[10px]">
              <StatusChip status={task.status} size="sm" />
            </td>

            {/* Priority */}
            <td className="px-[12px] py-[10px]">
              <span className={`text-[11px] font-semibold px-[6px] py-[1px] rounded-full border ${
                (task.priority ?? 3) <= 2
                  ? 'bg-danger-bg text-danger border-danger-b'
                  : (task.priority ?? 3) >= 4
                    ? 'bg-ok-bg text-ok border-ok-b'
                    : 'bg-surf2 text-text2 border-wf-border'
              }`}>
                P{task.priority ?? 3}
              </span>
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
          </tr>
        )
      })}
    </>
  )
}

export function TaskTable({ tasks, selectedIds, onSelectionChange }: TaskTableProps) {
  const { t, locale } = useI18n()
  const router = useRouter()
  const { can } = usePermission()
  const deleteTask = useBulkDeleteTasks()
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [editingCell, setEditingCell] = useState<{ taskId: string; field: string } | null>(null)
  const [editDraft, setEditDraft] = useState<string>('')
  const updateTask = useUpdateTask()
  const { data: clients } = useClients()
  const { data: members } = useMembers()
  const statusLabels = useMemo(() => getStatusLabels(locale), [locale])
  const [sortField, setSortField] = useState<SortField | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('asc')
    }
    setCurrentPage(1)
  }, [sortField])

  const handleInlineSave = useCallback((taskId: string, field: string, value: any) => {
    updateTask.mutate({ taskId, data: { [field]: value || null } })
    setEditingCell(null)
  }, [updateTask])

  const startEdit = useCallback((taskId: string, field: string, currentValue: string) => {
    setEditingCell({ taskId, field })
    setEditDraft(currentValue ?? '')
  }, [])

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

  const sortedTasks = useMemo(() => {
    if (!sortField) return rootTasks
    const sorted = [...rootTasks]
    const dir = sortDir === 'asc' ? 1 : -1
    sorted.sort((a, b) => {
      switch (sortField) {
        case 'wbs':
          return dir * (a.wbs_code ?? '').localeCompare(b.wbs_code ?? '')
        case 'client':
          return dir * a.client.name.localeCompare(b.client.name, 'ja')
        case 'title':
          return dir * a.title.localeCompare(b.title, 'ja')
        case 'assignee': {
          const nameA = a.assigned_user?.name ?? ''
          const nameB = b.assigned_user?.name ?? ''
          return dir * nameA.localeCompare(nameB, 'ja')
        }
        case 'status': {
          const statusOrder = { waiting: 0, todo: 1, in_progress: 2, done: 3, rejected: 4 }
          return dir * ((statusOrder[a.status] ?? 5) - (statusOrder[b.status] ?? 5))
        }
        case 'priority':
          return dir * ((a.priority ?? 3) - (b.priority ?? 3))
        case 'progress':
          return dir * (a.progress - b.progress)
        case 'deadline': {
          const deadA = a.confirmed_deadline ?? a.desired_deadline ?? '9999'
          const deadB = b.confirmed_deadline ?? b.desired_deadline ?? '9999'
          return dir * deadA.localeCompare(deadB)
        }
        case 'estimate':
          return dir * ((a.estimated_hours ?? 0) - (b.estimated_hours ?? 0))
        case 'actual':
          return dir * (a.actual_hours - b.actual_hours)
        default:
          return 0
      }
    })
    return sorted
  }, [rootTasks, sortField, sortDir])

  const selectable = !!onSelectionChange
  const selected = selectedIds ?? new Set<string>()

  const totalPages = pageSize === 0 ? 1 : Math.max(1, Math.ceil(sortedTasks.length / pageSize))

  // Reset to page 1 if tasks change and current page is out of bounds
  const safePage = currentPage > totalPages ? 1 : currentPage

  const pagedTasks = useMemo(() => {
    if (pageSize === 0) return sortedTasks
    const start = (safePage - 1) * pageSize
    return sortedTasks.slice(start, start + pageSize)
  }, [sortedTasks, safePage, pageSize])

  // Reset page when tasks array identity changes (filters applied)
  const [prevTasksLen, setPrevTasksLen] = useState(sortedTasks.length)
  if (sortedTasks.length !== prevTasksLen) {
    setPrevTasksLen(sortedTasks.length)
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
        totalCount={sortedTasks.length}
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
              {COLUMN_KEYS.map((key, idx) => {
                const field = SORT_FIELDS[idx]
                const isActive = sortField === field
                return (
                  <th
                    key={key}
                    onClick={() => handleSort(field)}
                    className="px-[12px] py-[10px] text-[11px] font-semibold text-text2 whitespace-nowrap cursor-pointer hover:text-mint select-none transition-colors"
                  >
                    <span className="inline-flex items-center gap-[4px]">
                      {t(key)}
                      {isActive && (
                        <span className="text-mint text-[10px]">
                          {sortDir === 'asc' ? '\u25B2' : '\u25BC'}
                        </span>
                      )}
                      {!isActive && (
                        <span className="text-text3/50 text-[9px]">{'\u25B4\u25BE'}</span>
                      )}
                    </span>
                  </th>
                )
              })}
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
                  onClick={() => { if (!editingCell) router.push(`/tasks/${task.id}`) }}
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
                  <td className="px-[12px] py-[10px]"
                    onDoubleClick={(e) => { e.stopPropagation(); startEdit(task.id, 'client_id', task.client_id) }}
                  >
                    {editingCell?.taskId === task.id && editingCell.field === 'client_id' ? (
                      <select
                        value={editDraft}
                        onChange={(e) => { handleInlineSave(task.id, 'client_id', e.target.value) }}
                        onBlur={() => setEditingCell(null)}
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                        className="text-[11.5px] text-text bg-surface border border-mint rounded px-1 py-0.5 focus:outline-none"
                      >
                        {clients?.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-[11.5px] font-bold text-text whitespace-nowrap">
                        {task.client.name}
                      </span>
                    )}
                  </td>

                  {/* Task name */}
                  <td className="px-[12px] py-[10px] min-w-[180px]"
                    onDoubleClick={(e) => { e.stopPropagation(); startEdit(task.id, 'title', task.title) }}
                  >
                    {editingCell?.taskId === task.id && editingCell.field === 'title' ? (
                      <input
                        type="text"
                        value={editDraft}
                        onChange={(e) => setEditDraft(e.target.value)}
                        onBlur={() => handleInlineSave(task.id, 'title', editDraft)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleInlineSave(task.id, 'title', editDraft)
                          if (e.key === 'Escape') setEditingCell(null)
                        }}
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                        className="text-[12.5px] font-bold text-text bg-surface border border-mint rounded px-1 py-0.5 w-full focus:outline-none"
                      />
                    ) : (
                      <>
                        <div className="text-[12.5px] font-bold text-text leading-tight">
                          {task.title}
                        </div>
                        {task.description && (
                          <div className="text-[11px] text-text3 mt-[2px] line-clamp-1">
                            {task.description}
                          </div>
                        )}
                      </>
                    )}
                  </td>

                  {/* Assignee(s) */}
                  <td className="px-[12px] py-[10px]"
                    onDoubleClick={(e) => { e.stopPropagation(); startEdit(task.id, 'assigned_to', task.assigned_to ?? '') }}
                  >
                    {editingCell?.taskId === task.id && editingCell.field === 'assigned_to' ? (
                      <select
                        value={editDraft}
                        onChange={(e) => { handleInlineSave(task.id, 'assigned_to', e.target.value || null) }}
                        onBlur={() => setEditingCell(null)}
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                        className="text-[11.5px] text-text bg-surface border border-mint rounded px-1 py-0.5 focus:outline-none"
                      >
                        <option value="">{t('tasks.unassigned')}</option>
                        {members?.filter((m) => m.is_active).map((m) => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                      </select>
                    ) : task.assignees && task.assignees.length > 0 ? (
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

                  {/* Status */}
                  <td className="px-[12px] py-[10px]"
                    onDoubleClick={(e) => { e.stopPropagation(); startEdit(task.id, 'status', task.status) }}
                  >
                    {editingCell?.taskId === task.id && editingCell.field === 'status' ? (
                      <select
                        value={editDraft}
                        onChange={(e) => {
                          handleInlineSave(task.id, 'status', e.target.value)
                        }}
                        onBlur={() => setEditingCell(null)}
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                        className="text-[11px] text-text bg-surface border border-mint rounded px-1 py-0.5 focus:outline-none"
                      >
                        {Object.entries(statusLabels).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    ) : (
                      <StatusChip status={task.status} size="sm" />
                    )}
                  </td>

                  {/* Priority */}
                  <td className="px-[12px] py-[10px]"
                    onDoubleClick={(e) => { e.stopPropagation(); startEdit(task.id, 'priority', String(task.priority ?? 3)) }}
                  >
                    {editingCell?.taskId === task.id && editingCell.field === 'priority' ? (
                      <select
                        value={editDraft}
                        onChange={(e) => {
                          updateTask.mutate({ taskId: task.id, data: { priority: Number(e.target.value) } as any })
                          setEditingCell(null)
                        }}
                        onBlur={() => setEditingCell(null)}
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                        className="text-[11px] text-text bg-surface border border-mint rounded px-1 py-0.5 focus:outline-none"
                      >
                        <option value={1}>1</option>
                        <option value={2}>2</option>
                        <option value={3}>3</option>
                        <option value={4}>4</option>
                        <option value={5}>5</option>
                      </select>
                    ) : (
                      <span className={`text-[11px] font-semibold px-[6px] py-[1px] rounded-full border ${
                        (task.priority ?? 3) <= 2
                          ? 'bg-danger-bg text-danger border-danger-b'
                          : (task.priority ?? 3) >= 4
                            ? 'bg-ok-bg text-ok border-ok-b'
                            : 'bg-surf2 text-text2 border-wf-border'
                      }`}>
                        P{task.priority ?? 3}
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
                  <td className="px-[12px] py-[10px]"
                    onDoubleClick={(e) => { e.stopPropagation(); startEdit(task.id, 'confirmed_deadline', task.confirmed_deadline?.slice(0, 10) ?? '') }}
                  >
                    {editingCell?.taskId === task.id && editingCell.field === 'confirmed_deadline' ? (
                      <input
                        type="date"
                        value={editDraft}
                        onChange={(e) => { handleInlineSave(task.id, 'confirmed_deadline', e.target.value || null) }}
                        onBlur={() => setEditingCell(null)}
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                        className="text-[11.5px] text-text bg-surface border border-mint rounded px-1 py-0.5 focus:outline-none"
                      />
                    ) : deadline ? (
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
