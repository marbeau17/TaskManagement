'use client'

import Link from 'next/link'
import { useCallback, useMemo, useState } from 'react'
import { List, Columns3, GanttChartSquare } from 'lucide-react'
import { Topbar } from '@/components/layout'
import { PeriodToggle, TableSkeleton } from '@/components/shared'
import { TaskFilters } from '@/components/tasks/TaskFilters'
import { TaskStatusTabs } from '@/components/tasks/TaskStatusTabs'
import { TaskTable } from '@/components/tasks/TaskTable'
import { KanbanBoard } from '@/components/tasks/KanbanBoard'
import { GanttChart } from '@/components/tasks/GanttChart'
import { BulkActionBar } from '@/components/tasks/BulkActionBar'
import { useTasks, useUpdateTaskProgress } from '@/hooks/useTasks'
import { useI18n } from '@/hooks/useI18n'
import { useFilterStore } from '@/stores/filterStore'
import { usePermission } from '@/hooks/usePermission'
import { exportTasksCsv } from '@/lib/csv-export'
import { PERIOD_OPTIONS } from '@/lib/constants'
import type { TaskFilters as TaskFiltersType } from '@/types/task'
import type { TaskStatus } from '@/types/database'

export default function TasksPage() {
  const {
    search,
    client_id,
    assigned_to,
    requested_by,
    status,
    period,
    setPeriod,
  } = useFilterStore()

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [viewMode, setViewMode] = useState<'list' | 'kanban' | 'gantt'>('list')

  // Build filters for the query (excluding status, which we filter client-side
  // so the status tabs can show counts for all statuses)
  const queryFilters: TaskFiltersType = useMemo(
    () => ({
      search: search || undefined,
      client_id,
      assigned_to,
      requested_by,
      period,
    }),
    [search, client_id, assigned_to, requested_by, period]
  )

  const { t } = useI18n()
  const { can } = usePermission()
  const { data: allTasks, isLoading } = useTasks(queryFilters)
  const tasks = allTasks ?? []
  const updateProgress = useUpdateTaskProgress()

  const handleStatusChange = useCallback(
    (taskId: string, newStatus: TaskStatus) => {
      const task = tasks.find((t) => t.id === taskId)
      if (!task) return
      updateProgress.mutate({
        taskId,
        update: {
          progress: newStatus === 'done' ? 100 : task.progress,
          status: newStatus,
          actual_hours: task.actual_hours ?? 0,
        },
      })
    },
    [tasks, updateProgress]
  )

  // Filter by status client-side so tabs can show counts for all statuses
  const filteredTasks = useMemo(() => {
    if (!status || status === 'all') return tasks
    return tasks.filter((t) => t.status === status)
  }, [tasks, status])

  const handleCsvExport = () => {
    if (filteredTasks.length > 0) {
      exportTasksCsv(filteredTasks)
    }
  }

  return (
    <>
      <Topbar
        title={t('tasks.title')}
        subtitle={t('tasks.totalCount').replace('{count}', String(tasks.length))}
      >
        {/* Desktop only controls */}
        <div className="hidden md:contents">
          <PeriodToggle
            options={PERIOD_OPTIONS}
            value={period ?? 'all'}
            onChange={(v) => setPeriod(v as 'week' | 'month' | 'all')}
          />
        </div>

        {/* View toggle */}
        <div className="flex items-center rounded-[7px] border border-wf-border overflow-hidden">
          <button
            onClick={() => setViewMode('list')}
            title={t('tasks.listView') ?? 'List'}
            className={`
              h-[30px] md:h-[34px] px-[8px] md:px-[10px] text-[11px] md:text-[12px] font-semibold transition-colors
              inline-flex items-center gap-[4px]
              ${viewMode === 'list'
                ? 'bg-mint text-white'
                : 'text-text2 hover:bg-surf2'}
            `}
          >
            <List size={14} />
            <span className="hidden md:inline">{t('tasks.listView') ?? 'List'}</span>
          </button>
          <button
            onClick={() => setViewMode('kanban')}
            title={t('tasks.kanbanView') ?? 'Kanban'}
            className={`
              h-[30px] md:h-[34px] px-[8px] md:px-[10px] text-[11px] md:text-[12px] font-semibold transition-colors
              inline-flex items-center gap-[4px] border-l border-wf-border
              ${viewMode === 'kanban'
                ? 'bg-mint text-white'
                : 'text-text2 hover:bg-surf2'}
            `}
          >
            <Columns3 size={14} />
            <span className="hidden md:inline">{t('tasks.kanbanView') ?? 'Kanban'}</span>
          </button>
          <button
            onClick={() => setViewMode('gantt')}
            title={t('tasks.ganttView') ?? 'Gantt'}
            className={`
              h-[30px] md:h-[34px] px-[8px] md:px-[10px] text-[11px] md:text-[12px] font-semibold transition-colors
              inline-flex items-center gap-[4px] border-l border-wf-border
              ${viewMode === 'gantt'
                ? 'bg-mint text-white'
                : 'text-text2 hover:bg-surf2'}
            `}
          >
            <GanttChartSquare size={14} />
            <span className="hidden md:inline">{t('tasks.ganttView') ?? 'Gantt'}</span>
          </button>
        </div>

        <div className="hidden md:flex items-center gap-[6px]">
          {can('tasks', 'create') && (
            <button
              onClick={handleCsvExport}
              disabled={filteredTasks.length === 0}
              className="
                h-[34px] px-[14px] rounded-[7px] text-[12px] font-semibold
                border border-wf-border text-text2
                hover:bg-surf2 transition-colors
                disabled:opacity-40 disabled:cursor-not-allowed
              "
            >
              {t('tasks.csvExport')}
            </button>
          )}

          {can('tasks', 'create') && (
            <Link
              href="/tasks/new"
              className="
                h-[34px] px-[16px] rounded-[7px] text-[12px] font-bold
                bg-mint text-white hover:bg-mint-d transition-colors
                inline-flex items-center
              "
            >
              {t('tasks.newTask')}
            </Link>
          )}
        </div>

        {/* Mobile: compact new task button */}
        {can('tasks', 'create') && (
          <Link
            href="/tasks/new"
            className="
              md:hidden h-[30px] px-[10px] rounded-[7px] text-[11px] font-bold
              bg-mint text-white hover:bg-mint-d transition-colors
              inline-flex items-center
            "
          >
            + {t('tasks.newTask')}
          </Link>
        )}
      </Topbar>

      <div className="flex-1 min-h-0 overflow-auto p-[12px] md:p-[20px] flex flex-col gap-[16px]" style={{ WebkitOverflowScrolling: 'touch' }}>
        {/* Filters */}
        <TaskFilters />

        {/* Status tabs (pass all tasks so counts reflect all statuses) */}
        <TaskStatusTabs tasks={tasks} />

        {/* Bulk action bar */}
        <BulkActionBar
          selectedIds={selectedIds}
          onClearSelection={() => setSelectedIds(new Set())}
        />

        {/* Task view */}
        {viewMode === 'gantt' ? (
          isLoading ? (
            <TableSkeleton rows={8} columns={8} />
          ) : (
            <div className="bg-surface rounded-[10px] border border-wf-border shadow-sm overflow-hidden flex-1 min-h-[400px]">
              <GanttChart tasks={filteredTasks} />
            </div>
          )
        ) : viewMode === 'kanban' ? (
          isLoading ? (
            <TableSkeleton rows={8} columns={5} />
          ) : (
            <KanbanBoard
              tasks={filteredTasks}
              onStatusChange={handleStatusChange}
            />
          )
        ) : (
          <div className="bg-surface rounded-[10px] border border-wf-border shadow-sm overflow-hidden">
            {isLoading ? (
              <TableSkeleton rows={8} columns={8} />
            ) : (
              <TaskTable
                tasks={filteredTasks}
                selectedIds={selectedIds}
                onSelectionChange={setSelectedIds}
              />
            )}
          </div>
        )}
      </div>
    </>
  )
}
