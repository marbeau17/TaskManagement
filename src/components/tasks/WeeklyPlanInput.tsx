'use client'

import { useState, useMemo } from 'react'
import { addDays, format } from 'date-fns'
import type { TaskWithRelations } from '@/types/database'
import { useUpdateTask } from '@/hooks/useTasks'
import { useI18n } from '@/hooks/useI18n'

interface WeeklyPlanInputProps {
  task: TaskWithRelations & { weekly_plan?: Record<string, number> | null }
}

function getMonday(date: Date): Date {
  const day = date.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(date)
  monday.setDate(date.getDate() + diff)
  monday.setHours(0, 0, 0, 0)
  return monday
}

export function WeeklyPlanInput({ task }: WeeklyPlanInputProps) {
  const { t } = useI18n()
  const updateTask = useUpdateTask()
  const [weekOffset, setWeekOffset] = useState(0)

  // Show 6 weeks starting from current week + offset
  const weeks = useMemo(() => {
    const baseMonday = getMonday(new Date())
    return Array.from({ length: 6 }, (_, i) => {
      const monday = addDays(baseMonday, (weekOffset + i) * 7)
      const sunday = addDays(monday, 6)
      return {
        key: format(monday, 'yyyy-MM-dd'),
        label: `${format(monday, 'M/d')} - ${format(sunday, 'M/d')}`,
        monday,
      }
    })
  }, [weekOffset])

  const plan: Record<string, number> = (task as any).weekly_plan ?? {}
  const totalPlanned = Object.values(plan).reduce((s, v) => s + v, 0)

  const handleChange = (weekKey: string, hours: number) => {
    const newPlan = { ...plan }
    if (hours <= 0) {
      delete newPlan[weekKey]
    } else {
      newPlan[weekKey] = hours
    }
    updateTask.mutate({ taskId: task.id, data: { weekly_plan: newPlan } as any })
  }

  return (
    <div className="bg-surface rounded-lg border border-wf-border p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[13px] font-bold text-text">
          {t('weeklyPlan.title')}
        </h3>
        <div className="flex items-center gap-[6px]">
          <span className="text-[11px] text-text2">
            {t('weeklyPlan.totalPlanned')}: <span className="font-bold text-mint">{totalPlanned}h</span>
            {task.estimated_hours ? (
              <span className="text-text3"> / {task.estimated_hours}h</span>
            ) : null}
          </span>
        </div>
      </div>

      {/* Week navigation */}
      <div className="flex items-center gap-[8px] mb-3">
        <button
          onClick={() => setWeekOffset((o) => o - 3)}
          className="text-[11px] text-text2 hover:text-mint px-[6px] py-[2px] rounded border border-wf-border hover:border-mint transition-colors"
        >
          &laquo;
        </button>
        <button
          onClick={() => setWeekOffset((o) => o - 1)}
          className="text-[11px] text-text2 hover:text-mint px-[6px] py-[2px] rounded border border-wf-border hover:border-mint transition-colors"
        >
          &lsaquo;
        </button>
        <button
          onClick={() => setWeekOffset(0)}
          className="text-[10px] text-mint hover:text-mint-d font-medium transition-colors"
        >
          {t('workload.thisWeek')}
        </button>
        <button
          onClick={() => setWeekOffset((o) => o + 1)}
          className="text-[11px] text-text2 hover:text-mint px-[6px] py-[2px] rounded border border-wf-border hover:border-mint transition-colors"
        >
          &rsaquo;
        </button>
        <button
          onClick={() => setWeekOffset((o) => o + 3)}
          className="text-[11px] text-text2 hover:text-mint px-[6px] py-[2px] rounded border border-wf-border hover:border-mint transition-colors"
        >
          &raquo;
        </button>
      </div>

      {/* Week grid */}
      <div className="grid grid-cols-6 gap-[6px]">
        {weeks.map((week) => {
          const hours = plan[week.key] ?? 0
          const isCurrentWeek = week.key === format(getMonday(new Date()), 'yyyy-MM-dd')
          return (
            <div
              key={week.key}
              className={`rounded-[6px] border p-[8px] text-center ${
                isCurrentWeek
                  ? 'border-mint bg-mint-ll/30 dark:bg-mint-dd/20'
                  : 'border-wf-border'
              }`}
            >
              <div className="text-[10px] text-text2 mb-[4px] font-medium">
                {week.label}
              </div>
              <input
                type="number"
                min={0}
                max={40}
                step={0.5}
                value={hours || ''}
                placeholder="0"
                onChange={(e) => handleChange(week.key, Number(e.target.value))}
                className="w-full text-center text-[13px] font-bold text-text bg-surface border border-wf-border rounded px-1 py-[3px] focus:outline-none focus:border-mint"
              />
              <div className="text-[9px] text-text3 mt-[2px]">h</div>
              {hours > 0 && (
                <div className="mt-[4px] bg-mint/20 rounded-full h-[4px] overflow-hidden">
                  <div
                    className="h-full bg-mint rounded-full"
                    style={{ width: `${Math.min(100, (hours / (task.estimated_hours || hours)) * 100)}%` }}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
