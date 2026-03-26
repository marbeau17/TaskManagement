'use client'

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import type { TaskWithRelations } from '@/types/database'
import type { TaskStatus } from '@/types/database'
import { differenceInDays } from 'date-fns'

/** Gantt bar colors keyed by task status */
const BAR_COLORS: Record<TaskStatus, { bar: string; progress: string }> = {
  waiting: {
    bar: 'bg-amber-200 dark:bg-amber-800/60',
    progress: 'bg-amber-400 dark:bg-amber-500',
  },
  todo: {
    bar: 'bg-gray-200 dark:bg-gray-700',
    progress: 'bg-gray-400 dark:bg-gray-500',
  },
  in_progress: {
    bar: 'bg-blue-200 dark:bg-blue-800/60',
    progress: 'bg-blue-500 dark:bg-blue-400',
  },
  done: {
    bar: 'bg-emerald-200 dark:bg-emerald-800/60',
    progress: 'bg-emerald-500 dark:bg-emerald-400',
  },
  rejected: {
    bar: 'bg-red-200 dark:bg-red-800/60',
    progress: 'bg-red-400 dark:bg-red-500',
  },
}

interface GanttRowProps {
  task: TaskWithRelations
  /** Start of the visible timeline window */
  timelineStart: Date
  /** Total number of day columns in the timeline */
  totalDays: number
  /** Width of each day column in pixels */
  dayWidth: number
}

export function GanttRow({
  task,
  timelineStart,
  totalDays,
  dayWidth,
}: GanttRowProps) {
  const router = useRouter()

  const bar = useMemo(() => {
    const startDate = task.start_date
      ? new Date(task.start_date)
      : new Date(task.created_at)
    const endDate = task.confirmed_deadline
      ? new Date(task.confirmed_deadline)
      : task.desired_deadline
        ? new Date(task.desired_deadline)
        : null

    if (!endDate) return null

    const offsetDays = differenceInDays(startDate, timelineStart)
    const durationDays = Math.max(1, differenceInDays(endDate, startDate) + 1)

    // Clamp to visible range
    const visibleStart = Math.max(0, offsetDays)
    const visibleEnd = Math.min(totalDays, offsetDays + durationDays)
    if (visibleEnd <= visibleStart) return null

    return {
      left: visibleStart * dayWidth,
      width: (visibleEnd - visibleStart) * dayWidth,
    }
  }, [task, timelineStart, totalDays, dayWidth])

  const colors = BAR_COLORS[task.status] ?? BAR_COLORS.todo

  return (
    <div className="flex border-b border-wf-border hover:bg-surf2/40 transition-colors">
      {/* Fixed left column: task title */}
      <div
        className="
          w-[220px] min-w-[220px] shrink-0
          px-[10px] py-[6px] border-r border-wf-border
          cursor-pointer
          flex flex-col justify-center
        "
        onClick={() => router.push(`/tasks/${task.id}`)}
        title={task.title}
      >
        <div className="text-[11.5px] font-bold text-text leading-tight truncate">
          {task.title}
        </div>
        <div className="text-[10px] text-text3 truncate">
          {task.client.name}
        </div>
      </div>

      {/* Timeline bar area */}
      <div
        className="relative h-[40px] flex-1"
        style={{ minWidth: totalDays * dayWidth }}
      >
        {bar && (
          <div
            className={`
              absolute top-[8px] h-[24px] rounded-[4px]
              ${colors.bar}
              cursor-pointer group
            `}
            style={{ left: bar.left, width: Math.max(bar.width, 4) }}
            onClick={() => router.push(`/tasks/${task.id}`)}
            title={`${task.title} (${task.progress}%)`}
          >
            {/* Progress fill */}
            <div
              className={`
                h-full rounded-[4px]
                ${colors.progress}
                transition-all duration-200
              `}
              style={{ width: `${Math.min(100, task.progress)}%` }}
            />
            {/* Progress label on hover */}
            <span
              className="
                absolute inset-0 flex items-center justify-center
                text-[9px] font-bold text-white
                opacity-0 group-hover:opacity-100 transition-opacity
                drop-shadow-sm pointer-events-none
              "
            >
              {task.progress}%
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
