'use client'

import { useMemo, useRef, useState } from 'react'
import {
  addDays,
  differenceInDays,
  startOfWeek,
  startOfMonth,
  endOfMonth,
  format,
  isToday,
  isSameMonth,
  eachDayOfInterval,
  eachWeekOfInterval,
  eachMonthOfInterval,
} from 'date-fns'
import { ja } from 'date-fns/locale'
import type { TaskWithRelations } from '@/types/database'
import { GanttRow } from './GanttRow'
import { useI18n } from '@/hooks/useI18n'
import { APP_CONFIG } from '@/lib/config'

type ZoomLevel = 'day' | 'week' | 'month'

interface GanttChartProps {
  tasks: TaskWithRelations[]
}

/** Width in px per logical column at each zoom level */
const COLUMN_WIDTH = APP_CONFIG.gantt.columnWidth as Record<ZoomLevel, number>

const ZOOM_LEVEL_KEYS: Record<ZoomLevel, string> = {
  day: 'gantt.zoomDay',
  week: 'gantt.zoomWeek',
  month: 'gantt.zoomMonth',
}

const ZOOM_LEVELS: ZoomLevel[] = ['day', 'week', 'month']

export function GanttChart({ tasks }: GanttChartProps) {
  const { t } = useI18n()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [zoom, setZoom] = useState<ZoomLevel>('week')

  // ---------- compute timeline window ----------
  const { timelineStart, timelineEnd, totalDays, dayWidth } = useMemo(() => {
    const now = new Date()
    let minDate = now
    let maxDate = addDays(now, 30)

    tasks.forEach((t) => {
      const sd = t.start_date ? new Date(t.start_date) : new Date(t.created_at)
      const ed = t.confirmed_deadline
        ? new Date(t.confirmed_deadline)
        : t.desired_deadline
          ? new Date(t.desired_deadline)
          : null

      if (sd < minDate) minDate = sd
      if (ed && ed > maxDate) maxDate = ed
    })

    // Add padding
    const start = addDays(startOfWeek(minDate, { weekStartsOn: 1 }), -7)
    const end = addDays(maxDate, 14)
    const total = differenceInDays(end, start) + 1
    const dw = COLUMN_WIDTH[zoom]

    return { timelineStart: start, timelineEnd: end, totalDays: total, dayWidth: dw }
  }, [tasks, zoom])

  // ---------- header columns ----------
  const headerRows = useMemo(() => {
    if (zoom === 'day') {
      const days = eachDayOfInterval({ start: timelineStart, end: timelineEnd })
      return {
        top: null,
        bottom: days.map((d) => ({
          date: d,
          label: format(d, 'd'),
          width: dayWidth,
          isCurrentDay: isToday(d),
          isWeekend: d.getDay() === 0 || d.getDay() === 6,
        })),
      }
    }

    if (zoom === 'week') {
      const weeks = eachWeekOfInterval(
        { start: timelineStart, end: timelineEnd },
        { weekStartsOn: 1 }
      )
      // For the top row, show month labels
      const months = eachMonthOfInterval({ start: timelineStart, end: timelineEnd })
      const topCols = months.map((m) => {
        const mStart = m < timelineStart ? timelineStart : m
        const mEnd = endOfMonth(m) > timelineEnd ? timelineEnd : endOfMonth(m)
        const span = differenceInDays(mEnd, mStart) + 1
        return {
          label: format(m, 'yyyy/MM'),
          width: span * dayWidth,
        }
      })

      const bottomCols = weeks.map((w) => {
        const wEnd = addDays(w, 6)
        const clampedEnd = wEnd > timelineEnd ? timelineEnd : wEnd
        const span = differenceInDays(clampedEnd, w) + 1
        return {
          date: w,
          label: format(w, 'M/d'),
          width: span * dayWidth,
          isCurrentDay: false,
          isWeekend: false,
        }
      })

      return { top: topCols, bottom: bottomCols }
    }

    // month zoom
    const months = eachMonthOfInterval({ start: timelineStart, end: timelineEnd })
    const bottomCols = months.map((m) => {
      const mStart = m < timelineStart ? timelineStart : m
      const mEnd = endOfMonth(m) > timelineEnd ? timelineEnd : endOfMonth(m)
      const span = differenceInDays(mEnd, mStart) + 1
      return {
        date: m,
        label: format(m, 'yyyy/MM'),
        width: span * dayWidth,
        isCurrentDay: false,
        isWeekend: false,
      }
    })

    return { top: null, bottom: bottomCols }
  }, [timelineStart, timelineEnd, zoom, dayWidth])

  // ---------- today indicator position ----------
  const todayOffset = useMemo(() => {
    const now = new Date()
    const offset = differenceInDays(now, timelineStart)
    if (offset < 0 || offset > totalDays) return null
    return offset * dayWidth + dayWidth / 2
  }, [timelineStart, totalDays, dayWidth])

  // ---------- background day stripes ----------
  const dayStripes = useMemo(() => {
    if (zoom !== 'day') return null
    const days = eachDayOfInterval({ start: timelineStart, end: timelineEnd })
    return days.map((d, i) => {
      const weekend = d.getDay() === 0 || d.getDay() === 6
      const today = isToday(d)
      return {
        key: i,
        left: i * dayWidth,
        width: dayWidth,
        weekend,
        today,
      }
    })
  }, [timelineStart, timelineEnd, zoom, dayWidth])

  // Sort tasks: root tasks only, no subtasks in top level
  const rootTasks = useMemo(() => {
    return tasks.filter((t) => !t.parent_task_id)
  }, [tasks])

  // Scroll to today on mount
  const hasScrolled = useRef(false)
  if (scrollRef.current && todayOffset !== null && !hasScrolled.current) {
    hasScrolled.current = true
    const container = scrollRef.current
    // Center the today line in the viewport
    setTimeout(() => {
      container.scrollLeft = Math.max(0, todayOffset - container.clientWidth / 2 + 220)
    }, 0)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-[8px] px-[12px] py-[8px] border-b border-wf-border bg-surface">
        <span className="text-[11px] font-semibold text-text2 mr-[4px]">
          {t('gantt.zoom')}
        </span>
        {ZOOM_LEVELS.map((level) => (
          <button
            key={level}
            onClick={() => {
              setZoom(level)
              hasScrolled.current = false
            }}
            className={`
              h-[26px] px-[10px] rounded-[5px] text-[11px] font-semibold
              border transition-colors
              ${
                zoom === level
                  ? 'bg-mint text-white border-mint'
                  : 'border-wf-border text-text2 hover:bg-surf2'
              }
            `}
          >
            {t(ZOOM_LEVEL_KEYS[level])}
          </button>
        ))}
        {/* Legend */}
        <div className="hidden md:flex items-center gap-[8px] ml-[16px]">
          <div className="flex items-center gap-[3px]"><div className="w-[10px] h-[6px] rounded bg-amber-300" /><span className="text-[9px] text-text3">{t('tasks.statusWaiting') ?? 'Waiting'}</span></div>
          <div className="flex items-center gap-[3px]"><div className="w-[10px] h-[6px] rounded bg-gray-300" /><span className="text-[9px] text-text3">{t('tasks.statusTodo') ?? 'Todo'}</span></div>
          <div className="flex items-center gap-[3px]"><div className="w-[10px] h-[6px] rounded bg-blue-400" /><span className="text-[9px] text-text3">{t('tasks.statusInProgress') ?? 'In Progress'}</span></div>
          <div className="flex items-center gap-[3px]"><div className="w-[10px] h-[6px] rounded bg-emerald-400" /><span className="text-[9px] text-text3">{t('tasks.statusDone') ?? 'Done'}</span></div>
          <div className="flex items-center gap-[3px]"><div className="w-[10px] h-[6px] rounded bg-red-400" /><span className="text-[9px] text-text3">{t('tasks.statusRejected') ?? 'Rejected'}</span></div>
        </div>
        <span className="ml-auto text-[10px] text-text3">
          {rootTasks.length} {t('gantt.taskCount')}
        </span>
      </div>

      {/* Scrollable chart area */}
      <div ref={scrollRef} className="flex-1 overflow-auto relative">
        <div style={{ minWidth: 320 + totalDays * dayWidth }}>
          {/* ===== Header ===== */}
          <div className="sticky top-0 z-10 bg-surface border-b border-wf-border">
            {/* Top row (month labels for week zoom) */}
            {headerRows.top && (
              <div className="flex border-b border-wf-border">
                <div className="w-[220px] min-w-[220px] shrink-0 border-r border-wf-border sticky left-0 z-20 bg-surface" />
                <div className="w-[100px] min-w-[100px] shrink-0 border-r border-wf-border sticky left-[220px] z-20 bg-surface" />
                {headerRows.top.map((col, i) => (
                  <div
                    key={i}
                    className="text-[10px] font-semibold text-text2 text-center py-[4px] border-r border-wf-border/50"
                    style={{ width: col.width }}
                  >
                    {col.label}
                  </div>
                ))}
              </div>
            )}

            {/* Bottom row (day / week / month labels) */}
            <div className="flex">
              <div className="w-[220px] min-w-[220px] shrink-0 border-r border-wf-border px-[10px] py-[4px] sticky left-0 z-20 bg-surface">
                <span className="text-[10px] font-semibold text-text2">
                  {t('gantt.taskName')} / {t('gantt.assignee')}
                </span>
              </div>
              <div className="w-[100px] min-w-[100px] shrink-0 border-r border-wf-border px-[6px] py-[4px] sticky left-[220px] z-20 bg-surface">
                <span className="text-[10px] font-semibold text-text2">
                  {t('tasks.ganttPeriod')}
                </span>
              </div>
              {headerRows.bottom.map((col, i) => (
                <div
                  key={i}
                  className={`
                    text-[10px] text-center py-[4px]
                    border-r border-wf-border/30
                    ${col.isCurrentDay ? 'bg-red-50 dark:bg-red-900/20 font-bold text-red-600 dark:text-red-400' : ''}
                    ${col.isWeekend ? 'bg-gray-50 dark:bg-gray-800/40 text-text3' : 'text-text2'}
                  `}
                  style={{ width: col.width }}
                >
                  {col.label}
                </div>
              ))}
            </div>
          </div>

          {/* ===== Task rows ===== */}
          <div className="relative">
            {/* Day stripe background columns (day zoom only) */}
            {dayStripes && (
              <div className="absolute inset-0 pointer-events-none" style={{ left: 320 }}>
                {dayStripes.map((s) => (
                  <div
                    key={s.key}
                    className={
                      s.weekend
                        ? 'absolute top-0 bottom-0 bg-gray-50 dark:bg-gray-800/30'
                        : ''
                    }
                    style={{ left: s.left, width: s.width }}
                  />
                ))}
              </div>
            )}

            {/* Today indicator line */}
            {todayOffset !== null && (
              <div
                className="absolute top-0 bottom-0 w-[2px] bg-red-500 z-[5] pointer-events-none"
                style={{ left: 320 + todayOffset }}
              />
            )}

            {/* Rows */}
            {rootTasks.length === 0 ? (
              <div className="px-[20px] py-[40px] text-center text-text3 text-[13px]">
                {t('gantt.empty')}
              </div>
            ) : (
              rootTasks.map((task) => (
                <GanttRow
                  key={task.id}
                  task={task}
                  timelineStart={timelineStart}
                  totalDays={totalDays}
                  dayWidth={dayWidth}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
