'use client'

import Link from 'next/link'
import { useMemo, useState, useCallback } from 'react'
import { Topbar } from '@/components/layout'
import { PeriodToggle, TableSkeleton } from '@/components/shared'
import { TaskFilters } from '@/components/tasks/TaskFilters'
import { TaskStatusTabs } from '@/components/tasks/TaskStatusTabs'
import { TaskTable } from '@/components/tasks/TaskTable'
import { KanbanBoard } from '@/components/tasks/KanbanBoard'
import { BulkActionBar } from '@/components/tasks/BulkActionBar'
import { useTasks, useUpdateTaskProgress } from '@/hooks/useTasks'
import { useFilterStore } from '@/stores/filterStore'
import { usePermission } from '@/hooks/usePermission'
import { useI18n } from '@/hooks/useI18n'
import { exportTasksCsv } from '@/lib/csv-export'
import { PERIOD_OPTIONS } from '@/lib/constants'
import type { TaskFilters as TaskFiltersType } from '@/types/task'
import type { TaskStatus } from '@/types/database'

type ViewMode = 'list' | 'kanban'

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
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const { t } = useI18n()

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

  const { can } = usePermission()
  const { data: allTasksResult, isLoading } = useTasks(queryFilters)
  const updateProgress = useUpdateTaskProgress()
  const tasks = allTasksResult?.data ?? []

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

  const handleStatusChange = useCallback(
    (taskId: string, newStatus: TaskStatus) => {
      const task = tasks.find((t) => t.id === taskId)
      if (!task) return

      // Determine progress based on new status
      let progress = task.progress
      if (newStatus === 'done') progress = 100
      else if (newStatus === 'waiting' || newStatus === 'todo') progress = 0

      updateProgress.mutate({
        taskId,
        update: {
          status: newStatus,
          progress,
          actual_hours: task.actual_hours,
        },
      })
    },
    [tasks, updateProgress]
  )

  return (
    <>
      <Topbar
        title="タスク一覧"
        subtitle={`全 ${tasks.length} 件`}
      >
        {/* View toggle */}
        <div className="flex items-center border border-wf-border rounded-[7px] overflow-hidden">
          <button
            onClick={() => setViewMode('list')}
            title={t('tasks.listView')}
            className={`
              h-[34px] w-[36px] flex items-center justify-center transition-colors
              ${viewMode === 'list'
                ? 'bg-mint text-white'
                : 'bg-surface text-text2 hover:bg-surf2'
              }
            `}
          >
            {/* List icon */}
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
          <button
            onClick={() => setViewMode('kanban')}
            title={t('tasks.kanbanView')}
            className={`
              h-[34px] w-[36px] flex items-center justify-center transition-colors
              border-l border-wf-border
              ${viewMode === 'kanban'
                ? 'bg-mint text-white'
                : 'bg-surface text-text2 hover:bg-surf2'
              }
            `}
          >
            {/* Kanban icon */}
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="1" y="2" width="4" height="12" rx="1" stroke="currentColor" strokeWidth="1.3" />
              <rect x="6" y="2" width="4" height="8" rx="1" stroke="currentColor" strokeWidth="1.3" />
              <rect x="11" y="2" width="4" height="10" rx="1" stroke="currentColor" strokeWidth="1.3" />
            </svg>
          </button>
        </div>

        <PeriodToggle
          options={PERIOD_OPTIONS}
          value={period ?? 'all'}
          onChange={(v) => setPeriod(v as 'week' | 'month' | 'all')}
        />

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
            CSV出力
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
            + タスク依頼
          </Link>
        )}
      </Topbar>

      <div className="flex-1 overflow-y-auto p-[12px] md:p-[20px] flex flex-col gap-[16px]">
        {/* Filters */}
        <TaskFilters />

        {/* Status tabs (pass all tasks so counts reflect all statuses) */}
        <TaskStatusTabs tasks={tasks} />

        {/* Bulk action bar (only in list view) */}
        {viewMode === 'list' && (
          <BulkActionBar
            selectedIds={selectedIds}
            onClearSelection={() => setSelectedIds(new Set())}
          />
        )}

        {/* Content area */}
        {viewMode === 'list' ? (
          /* Task table card */
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
        ) : (
          /* Kanban board */
          isLoading ? (
            <div className="flex gap-[12px]">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="min-w-[260px] w-[260px] h-[400px] rounded-[10px] bg-surf2/30 dark:bg-surf2/20 border border-wf-border animate-pulse"
                />
              ))}
            </div>
          ) : (
            <KanbanBoard
              tasks={filteredTasks}
              onStatusChange={handleStatusChange}
            />
          )
        )}
      </div>
    </>
  )
}
