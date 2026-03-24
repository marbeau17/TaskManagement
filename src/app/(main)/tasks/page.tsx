'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { PeriodToggle } from '@/components/shared'
import { TaskFilters } from '@/components/tasks/TaskFilters'
import { TaskStatusTabs } from '@/components/tasks/TaskStatusTabs'
import { TaskTable } from '@/components/tasks/TaskTable'
import { useTasks } from '@/hooks/useTasks'
import { useFilterStore } from '@/stores/filterStore'
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
    <div className="flex flex-col gap-[20px] p-[24px]">
      {/* Top bar */}
      <div className="flex items-center justify-between flex-wrap gap-[12px]">
        <div>
          <h1 className="text-[20px] font-bold text-text">タスク一覧</h1>
          <p className="text-[12px] text-text2 mt-[2px]">
            全 {tasks.length} 件
          </p>
        </div>

        <div className="flex items-center gap-[10px]">
          <PeriodToggle
            options={PERIOD_OPTIONS}
            value={period ?? 'all'}
            onChange={(v) => setPeriod(v as 'week' | 'month' | 'all')}
          />

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

          <Link
            href="/tasks/new"
            className="
              h-[34px] px-[16px] rounded-[7px] text-[12px] font-bold
              bg-mint text-white hover:bg-mint-d transition-colors
              inline-flex items-center
            "
          >
            ＋ タスク依頼
          </Link>
        </div>
      </div>

      {/* Filters */}
      <TaskFilters />

      {/* Status tabs (pass all tasks so counts reflect all statuses) */}
      <TaskStatusTabs tasks={tasks} />

      {/* Task table card */}
      <div className="bg-surface rounded-[10px] border border-wf-border shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-[48px]">
            <div className="text-[13px] text-text3">読み込み中...</div>
          </div>
        ) : (
          <TaskTable tasks={filteredTasks} />
        )}
      </div>
    </div>
  )
}
