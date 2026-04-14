'use client'

import { useState, useMemo } from 'react'
import { addDays, format } from 'date-fns'
import type { TaskWithRelations } from '@/types/database'
import { useUpdateTask } from '@/hooks/useTasks'
import { useI18n } from '@/hooks/useI18n'
import { getMonday } from '@/lib/workload-utils'

interface WeeklyPlanInputProps {
  task: TaskWithRelations
}

export function WeeklyPlanInput({ task }: WeeklyPlanInputProps) {
  const { t } = useI18n()
  const updateTask = useUpdateTask()
  const [weekOffset, setWeekOffset] = useState(0)

  const weeks = useMemo(() => {
    const baseMonday = getMonday(new Date())
    return Array.from({ length: 6 }, (_, i) => {
      const monday = addDays(baseMonday, (weekOffset + i) * 7)
      const sunday = addDays(monday, 6)
      return {
        key: format(monday, 'yyyy-MM-dd'),
        label: `${format(monday, 'M/d')}`,
        endLabel: `${format(sunday, 'M/d')}`,
        isCurrent: i === 0 && weekOffset === 0,
      }
    })
  }, [weekOffset])

  // Use local state to avoid re-render jitter from React Query cache invalidation
  const [localPlan, setLocalPlan] = useState<Record<string, number>>(() => (task.template_data as any)?.weekly_plan ?? {})
  const [localActual, setLocalActual] = useState<Record<string, number>>(() => (task.template_data as any)?.weekly_actual ?? {})
  const totalPlanned = Object.values(localPlan).reduce((s, v) => s + v, 0)
  const totalActual = Object.values(localActual).reduce((s, v) => s + v, 0)

  const savePlan = (weekKey: string, hours: number) => {
    const newPlan = { ...localPlan }
    if (hours <= 0) delete newPlan[weekKey]
    else newPlan[weekKey] = hours
    setLocalPlan(newPlan)
    const newData = { ...(task.template_data ?? {}), weekly_plan: newPlan }
    updateTask.mutate({ taskId: task.id, data: { template_data: newData } as any })
  }

  const saveActual = (weekKey: string, hours: number) => {
    const newActual = { ...localActual }
    if (hours <= 0) delete newActual[weekKey]
    else newActual[weekKey] = hours
    setLocalActual(newActual)
    const newData = { ...(task.template_data ?? {}), weekly_actual: newActual }
    // Sum weekly_actual values and sync task.actual_hours + progress
    const total = Object.values(newActual).reduce((s, v) => s + (v ?? 0), 0)
    const computedProgress = task.estimated_hours && task.estimated_hours > 0
      ? Math.min(100, Math.round((total / task.estimated_hours) * 100))
      : undefined
    updateTask.mutate({
      taskId: task.id,
      data: {
        template_data: newData,
        actual_hours: total,
        ...(computedProgress !== undefined ? { progress: computedProgress } : {}),
      } as any,
    })
  }

  return (
    <div className="bg-surface rounded-lg border border-wf-border p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[13px] font-bold text-text">{t('weeklyPlan.title')}</h3>
        <div className="flex items-center gap-[12px] text-[11px] text-text2">
          <span>{t('weeklyPlan.totalPlanned')}: <span className="font-bold text-mint">{totalPlanned}h</span>
            {task.estimated_hours ? <span className="text-text3"> / {task.estimated_hours}h</span> : null}
          </span>
          <span>{t('weeklyPlan.totalActual')}: <span className="font-bold text-blue-500">{totalActual}h</span></span>
        </div>
      </div>

      {/* Week navigation */}
      <div className="flex items-center gap-[6px] mb-3">
        <button onClick={() => setWeekOffset((o) => o - 3)} className="text-[11px] text-text2 hover:text-mint px-[5px] py-[2px] rounded border border-wf-border hover:border-mint transition-colors">&laquo;</button>
        <button onClick={() => setWeekOffset((o) => o - 1)} className="text-[11px] text-text2 hover:text-mint px-[5px] py-[2px] rounded border border-wf-border hover:border-mint transition-colors">&lsaquo;</button>
        <button onClick={() => setWeekOffset(0)} className="text-[10px] text-mint hover:text-mint-d font-medium">{t('workload.thisWeek')}</button>
        <button onClick={() => setWeekOffset((o) => o + 1)} className="text-[11px] text-text2 hover:text-mint px-[5px] py-[2px] rounded border border-wf-border hover:border-mint transition-colors">&rsaquo;</button>
        <button onClick={() => setWeekOffset((o) => o + 3)} className="text-[11px] text-text2 hover:text-mint px-[5px] py-[2px] rounded border border-wf-border hover:border-mint transition-colors">&raquo;</button>
        <div className="flex items-center gap-[8px] ml-auto text-[9px]">
          <span className="flex items-center gap-[3px]"><span className="w-[8px] h-[8px] rounded bg-mint inline-block" /> {t('weeklyPlan.planned')}</span>
          <span className="flex items-center gap-[3px]"><span className="w-[8px] h-[8px] rounded bg-blue-500 inline-block" /> {t('weeklyPlan.actual')}</span>
        </div>
      </div>

      {/* Week grid */}
      <div className="grid grid-cols-6 gap-[4px]">
        {weeks.map((week) => {
          const planned = localPlan[week.key] ?? 0
          const actualH = localActual[week.key] ?? 0
          return (
            <div
              key={week.key}
              className={`rounded-[6px] border p-[6px] ${
                week.isCurrent ? 'border-mint bg-mint-ll/30 dark:bg-mint-dd/20' : 'border-wf-border'
              }`}
            >
              <div className="text-[9px] text-text2 mb-[3px] font-medium text-center">
                {week.label}-{week.endLabel}
              </div>
              {/* Planned */}
              <div className="mb-[2px]">
                <input
                  type="number" min={0} max={40} step={0.5}
                  value={planned || ''}
                  placeholder="0"
                  onChange={(e) => { const v = Number(e.target.value); setLocalPlan((p) => ({ ...p, [week.key]: v })) }}
                  onBlur={(e) => savePlan(week.key, Number(e.target.value))}
                  className="w-full text-center text-[12px] font-bold text-mint bg-surface border border-mint/30 rounded px-1 py-[2px] focus:outline-none focus:border-mint"
                  title={t('weeklyPlan.planned')}
                />
              </div>
              {/* Actual */}
              <div>
                <input
                  type="number" min={0} max={40} step={0.5}
                  value={actualH || ''}
                  placeholder="0"
                  onChange={(e) => { const v = Number(e.target.value); setLocalActual((p) => ({ ...p, [week.key]: v })) }}
                  onBlur={(e) => saveActual(week.key, Number(e.target.value))}
                  className="w-full text-center text-[12px] font-bold text-blue-500 bg-surface border border-blue-300/30 rounded px-1 py-[2px] focus:outline-none focus:border-blue-500"
                  title={t('weeklyPlan.actual')}
                />
              </div>
              {/* Comparison bar */}
              {(planned > 0 || actualH > 0) && (
                <div className="mt-[3px] flex gap-[1px] h-[3px]">
                  <div className="bg-mint rounded-full" style={{ width: `${Math.min(100, (planned / Math.max(planned, actualH, 1)) * 100)}%` }} />
                  <div className="bg-blue-500 rounded-full" style={{ width: `${Math.min(100, (actualH / Math.max(planned, actualH, 1)) * 100)}%` }} />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
