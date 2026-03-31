'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { TaskStatus, TaskWithRelations } from '@/types/database'
import { Avatar, ProgressBar, StatusChip } from '@/components/shared'
import { STATUS_LABELS, STATUS_STYLES } from '@/lib/constants'
import { formatDate } from '@/lib/utils'
import { isOverdue } from '@/lib/date-utils'
import { isToday } from 'date-fns'
import { useI18n } from '@/hooks/useI18n'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface KanbanBoardProps {
  tasks: TaskWithRelations[]
  onStatusChange: (taskId: string, newStatus: TaskStatus) => void
}

const COLUMNS: TaskStatus[] = ['waiting', 'todo', 'in_progress', 'done', 'rejected', 'dropped']

const COLUMN_COLORS: Record<TaskStatus, { header: string; dropHighlight: string }> = {
  waiting: {
    header: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800',
    dropHighlight: 'bg-amber-50/50 dark:bg-amber-950/20',
  },
  todo: {
    header: 'bg-slate-100 dark:bg-slate-700 border-slate-300 dark:border-slate-600',
    dropHighlight: 'bg-slate-50/50 dark:bg-slate-700/20',
  },
  in_progress: {
    header: 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800',
    dropHighlight: 'bg-blue-50/50 dark:bg-blue-950/20',
  },
  done: {
    header: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800',
    dropHighlight: 'bg-emerald-50/50 dark:bg-emerald-950/20',
  },
  rejected: {
    header: 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800',
    dropHighlight: 'bg-red-50/50 dark:bg-red-950/20',
  },
  dropped: {
    header: 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600',
    dropHighlight: 'bg-gray-50/50 dark:bg-gray-800/20',
  },
}

// ---------------------------------------------------------------------------
// Task Card
// ---------------------------------------------------------------------------

function TaskCard({
  task,
  onDragStart,
}: {
  task: TaskWithRelations
  onDragStart: (e: React.DragEvent, taskId: string) => void
}) {
  const router = useRouter()
  const { t } = useI18n()
  const deadline = task.confirmed_deadline ?? task.desired_deadline
  const taskOverdue = deadline && task.status !== 'done' && isOverdue(deadline)
  const taskDueToday = deadline && task.status !== 'done' && isToday(new Date(deadline))

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, task.id)}
      onClick={() => router.push(`/tasks/${task.id}`)}
      className={`
        rounded-[8px] border border-wf-border p-[10px] cursor-grab
        active:cursor-grabbing
        hover:shadow-md transition-all duration-150
        ${taskOverdue ? 'bg-warn-bg' : 'bg-surface'}
      `}
    >
      {/* Client name */}
      <div className="flex items-center justify-between mb-[6px]">
        <span className="text-[10px] font-bold text-text2 truncate max-w-[120px]">
          {task.client.name}
        </span>
        {task.wbs_code && (
          <span className="text-[9px] font-mono text-text3">
            {task.wbs_code}
          </span>
        )}
      </div>

      {/* Title */}
      <div className="text-[12px] font-bold text-text mb-[8px] leading-tight line-clamp-2">
        {task.title}
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-[6px] mb-[8px]">
        <div className="flex-1">
          <ProgressBar value={task.progress} height="sm" />
        </div>
        <span className="text-[10px] font-semibold text-text2 w-[28px] text-right shrink-0">
          {task.progress}%
        </span>
      </div>

      {/* Bottom row: assignee + deadline */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-[4px]">
          {task.assignees && task.assignees.length > 0 ? (
            <div className="flex items-center -space-x-1.5">
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
              {task.assignees.length > 3 && (
                <span className="text-[9px] text-text3 ml-[2px]">
                  +{task.assignees.length - 3}
                </span>
              )}
            </div>
          ) : task.assigned_user ? (
            <Avatar
              name_short={task.assigned_user.name_short}
              color={task.assigned_user.avatar_color}
              size="sm"
            />
          ) : (
            <span className="text-[9px] italic text-warn">
              {t('kanban.unassigned')}
            </span>
          )}
        </div>

        {deadline ? (
          <span
            className={`text-[10px] whitespace-nowrap ${
              taskOverdue
                ? 'text-danger font-semibold'
                : taskDueToday
                  ? 'text-warn font-semibold'
                  : 'text-text3'
            }`}
          >
            {formatDate(deadline)}
          </span>
        ) : (
          <span className="text-[10px] text-text3">-</span>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Kanban Column
// ---------------------------------------------------------------------------

function KanbanColumn({
  status,
  tasks,
  onDragStart,
  onDragOver,
  onDrop,
  isDragOver,
}: {
  status: TaskStatus
  tasks: TaskWithRelations[]
  onDragStart: (e: React.DragEvent, taskId: string) => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent, status: TaskStatus) => void
  isDragOver: boolean
}) {
  const { t } = useI18n()
  const colors = COLUMN_COLORS[status]
  const statusStyle = STATUS_STYLES[status]

  return (
    <div
      className={`
        flex flex-col min-w-[260px] w-[260px] rounded-[10px] border border-wf-border
        transition-colors duration-150
        ${isDragOver ? colors.dropHighlight : 'bg-surf2/30 dark:bg-surf2/20'}
      `}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, status)}
    >
      {/* Column header */}
      <div
        className={`
          flex items-center justify-between px-[12px] py-[10px]
          rounded-t-[10px] border-b
          ${colors.header}
        `}
      >
        <div className="flex items-center gap-[6px]">
          <span className={`w-[8px] h-[8px] rounded-full ${statusStyle.bg} border ${statusStyle.border}`} />
          <span className="text-[12px] font-bold text-text">
            {STATUS_LABELS[status]}
          </span>
        </div>
        <span
          className={`
            min-w-[22px] h-[20px] px-[6px] rounded-full
            text-[10px] font-bold
            flex items-center justify-center
            ${statusStyle.bg} ${statusStyle.text} border ${statusStyle.border}
          `}
        >
          {tasks.length}
        </span>
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto p-[8px] flex flex-col gap-[8px] min-h-[100px]">
        {tasks.length === 0 && (
          <div className="flex-1 flex items-center justify-center py-[20px]">
            <span className="text-[11px] text-text3 italic">
              {t('kanban.noTasks')}
            </span>
          </div>
        )}
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onDragStart={onDragStart}
          />
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// KanbanBoard
// ---------------------------------------------------------------------------

export function KanbanBoard({ tasks, onStatusChange }: KanbanBoardProps) {
  const [dragOverColumn, setDragOverColumn] = useState<TaskStatus | null>(null)

  // Group tasks by status (only root tasks)
  const tasksByStatus = useMemo(() => {
    const rootTasks = tasks.filter((t) => !t.parent_task_id)
    const grouped: Record<TaskStatus, TaskWithRelations[]> = {
      waiting: [],
      todo: [],
      in_progress: [],
      done: [],
      rejected: [],
      dropped: [],
    }
    rootTasks.forEach((task) => {
      if (grouped[task.status]) {
        grouped[task.status].push(task)
      }
    })
    return grouped
  }, [tasks])

  const handleDragStart = useCallback((e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId)
    e.dataTransfer.effectAllowed = 'move'
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent, newStatus: TaskStatus) => {
      e.preventDefault()
      setDragOverColumn(null)
      const taskId = e.dataTransfer.getData('text/plain')
      if (!taskId) return

      // Find current status - skip if same
      const task = tasks.find((t) => t.id === taskId)
      if (!task || task.status === newStatus) return

      onStatusChange(taskId, newStatus)
    },
    [tasks, onStatusChange]
  )

  const handleColumnDragEnter = useCallback((status: TaskStatus) => {
    setDragOverColumn(status)
  }, [])

  const handleColumnDragLeave = useCallback(() => {
    setDragOverColumn(null)
  }, [])

  return (
    <div
      className="flex gap-[12px] overflow-x-auto pb-[8px]"
    >
      {COLUMNS.map((status) => (
        <div
          key={status}
          onDragEnter={() => handleColumnDragEnter(status)}
          onDragLeave={handleColumnDragLeave}
        >
          <KanbanColumn
            status={status}
            tasks={tasksByStatus[status]}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            isDragOver={dragOverColumn === status}
          />
        </div>
      ))}
    </div>
  )
}
