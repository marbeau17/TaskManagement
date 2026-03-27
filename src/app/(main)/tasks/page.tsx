'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { Topbar } from '@/components/layout'
import { PeriodToggle, TableSkeleton } from '@/components/shared'
import { TaskFilters } from '@/components/tasks/TaskFilters'
import { TaskStatusTabs } from '@/components/tasks/TaskStatusTabs'
import { TaskTable } from '@/components/tasks/TaskTable'
import { BulkActionBar } from '@/components/tasks/BulkActionBar'
import { useTasks } from '@/hooks/useTasks'
import { useI18n } from '@/hooks/useI18n'
import { useFilterStore } from '@/stores/filterStore'
import { usePermission } from '@/hooks/usePermission'
import { exportTasksCsv } from '@/lib/csv-export'
import { PERIOD_OPTIONS } from '@/lib/constants'
import type { TaskFilters as TaskFiltersType } from '@/types/task'

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
      </Topbar>

      <div className="flex-1 overflow-y-auto p-[12px] md:p-[20px] flex flex-col gap-[16px]">
        {/* Filters */}
        <TaskFilters />

        {/* Status tabs (pass all tasks so counts reflect all statuses) */}
        <TaskStatusTabs tasks={tasks} />

        {/* Bulk action bar */}
        <BulkActionBar
          selectedIds={selectedIds}
          onClearSelection={() => setSelectedIds(new Set())}
        />

        {/* Task table card */}
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
      </div>
    </>
  )
}
