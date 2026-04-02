'use client'

import { useMemo } from 'react'
import { addDays, format } from 'date-fns'
import { useTasks } from '@/hooks/useTasks'
import { useMembers } from '@/hooks/useMembers'
import { useI18n } from '@/hooks/useI18n'

function getMonday(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

export function UtilizationTrend() {
  const { t } = useI18n()
  const { data: tasks } = useTasks()
  const { data: members } = useMembers()

  const weeklyData = useMemo(() => {
    if (!tasks || !members) return []
    const activeMembers = members.filter((m) => m.is_active)
    const totalCapacity = activeMembers.reduce((s, m) => s + m.weekly_capacity_hours, 0)
    if (totalCapacity === 0) return []

    const baseMonday = getMonday(new Date())
    const weeks: { label: string; utilization: number; completed: number; added: number }[] = []

    for (let i = -7; i <= 0; i++) {
      const weekMonday = addDays(baseMonday, i * 7)
      const weekSunday = addDays(weekMonday, 6)
      const weekMondayStr = format(weekMonday, 'yyyy-MM-dd')
      const weekSundayStr = format(weekSunday, 'yyyy-MM-dd')

      // Tasks active during this week (deadline <= weekEnd, not done, assigned)
      const activeTasks = tasks.filter((t) => {
        if (t.status === 'rejected') return false
        if (!t.assigned_to) return false
        const deadline = t.confirmed_deadline ?? t.desired_deadline
        if (!deadline) return false
        return deadline <= weekSundayStr
      })

      const totalEstimated = activeTasks.reduce((s, t) => {
        const est = t.estimated_hours ?? 0
        const deadline = t.confirmed_deadline ?? t.desired_deadline
        if (!deadline || est <= 0) return s + est
        const start = t.start_date ? new Date(t.start_date) : new Date(t.created_at)
        const end = new Date(deadline)
        const totalWeeks = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000)))
        const assigneeCount = t.assignees?.length || 1
        return s + (est / totalWeeks) / assigneeCount
      }, 0)

      const utilization = Math.round((totalEstimated / totalCapacity) * 100)

      const completed = tasks.filter((t) =>
        t.status === 'done' && t.updated_at >= weekMondayStr && t.updated_at <= weekSundayStr
      ).length

      const added = tasks.filter((t) =>
        t.created_at >= weekMondayStr && t.created_at <= weekSundayStr
      ).length

      weeks.push({
        label: format(weekMonday, 'M/d'),
        utilization,
        completed,
        added,
      })
    }

    return weeks
  }, [tasks, members])

  if (weeklyData.length === 0) return null

  const maxUtil = Math.max(...weeklyData.map((w) => w.utilization), 100)

  return (
    <div className="bg-surface border border-border2 rounded-[10px] shadow overflow-hidden">
      <div className="px-[12px] py-[10px] border-b border-border2 bg-surf2">
        <h3 className="text-[13px] font-bold text-text">{t('workload.utilizationTrend')}</h3>
      </div>

      <div className="p-[12px]">
        {/* Bar chart */}
        <div className="flex items-end gap-[6px] h-[120px] mb-[8px]">
          {weeklyData.map((w, i) => {
            const heightPct = Math.min(100, (w.utilization / maxUtil) * 100)
            const isCurrentWeek = i === weeklyData.length - 1
            const barColor = w.utilization >= 100
              ? 'bg-red-500'
              : w.utilization >= 80
                ? 'bg-amber-500'
                : 'bg-emerald-500'
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-[2px]">
                <span className={`text-[9px] font-bold ${w.utilization >= 100 ? 'text-red-500' : 'text-text2'}`}>
                  {w.utilization}%
                </span>
                <div className="w-full flex justify-center">
                  <div
                    className={`w-[80%] rounded-t-[3px] transition-all ${barColor} ${isCurrentWeek ? 'ring-2 ring-mint ring-offset-1' : ''}`}
                    style={{ height: `${Math.max(4, heightPct)}%` }}
                    title={`${w.label}: ${w.utilization}% | +${w.added} | ✓${w.completed}`}
                  />
                </div>
              </div>
            )
          })}
        </div>

        {/* Labels */}
        <div className="flex gap-[6px]">
          {weeklyData.map((w, i) => (
            <div key={i} className="flex-1 text-center text-[9px] text-text3">
              {w.label}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-[12px] mt-[8px] text-[10px] text-text2">
          <div className="flex items-center gap-[4px]">
            <div className="w-[8px] h-[8px] rounded bg-emerald-500" /> &lt;80%
          </div>
          <div className="flex items-center gap-[4px]">
            <div className="w-[8px] h-[8px] rounded bg-amber-500" /> 80-99%
          </div>
          <div className="flex items-center gap-[4px]">
            <div className="w-[8px] h-[8px] rounded bg-red-500" /> &ge;100%
          </div>
          <span className="ml-auto text-text3">
            {t('workload.last8Weeks')}
          </span>
        </div>
      </div>
    </div>
  )
}
