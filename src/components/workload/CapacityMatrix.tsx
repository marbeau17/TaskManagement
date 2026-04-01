'use client'

import { useState, useMemo } from 'react'
import { addDays, format } from 'date-fns'
import { Avatar } from '@/components/shared'
import { useI18n } from '@/hooks/useI18n'
import { useTasks } from '@/hooks/useTasks'
import { useMembers } from '@/hooks/useMembers'
import { getTaskWeeklyHours, taskOverlapsWeek, getMonday } from '@/lib/workload-utils'

function getCellColor(rate: number): string {
  if (rate >= 100) return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
  if (rate >= 80) return 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
  if (rate > 0) return 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
  return 'text-text3'
}

export function CapacityMatrix() {
  const { t } = useI18n()
  const { data: members } = useMembers()
  const { data: tasks } = useTasks()
  const [weekOffset, setWeekOffset] = useState(0)

  const weeks = useMemo(() => {
    const baseMonday = getMonday(new Date())
    return Array.from({ length: 8 }, (_, i) => {
      const monday = addDays(baseMonday, (weekOffset + i) * 7)
      const sunday = addDays(monday, 6)
      return {
        key: format(monday, 'yyyy-MM-dd'),
        label: format(monday, 'M/d'),
        endLabel: format(sunday, 'M/d'),
        monday,
        sunday,
        isCurrent: i === 0 && weekOffset === 0,
      }
    })
  }, [weekOffset])

  // Calculate hours per member per week (aligned with getWorkloadSummaries logic)
  const matrix = useMemo(() => {
    if (!members || !tasks) return []
    const activeMembers = members.filter((m) => m.is_active)
    const allTasks = tasks as any[]

    // Build task_assignees lookup: taskId -> userId[]
    const taskAssigneeMap: Record<string, string[]> = {}
    allTasks.forEach((t) => {
      const ids: string[] = []
      if (t.assigned_to) ids.push(t.assigned_to)
      if (t.assignees && Array.isArray(t.assignees)) {
        t.assignees.forEach((a: any) => {
          if (a.user_id && !ids.includes(a.user_id)) ids.push(a.user_id)
        })
      }
      if (ids.length > 0) taskAssigneeMap[t.id] = ids
    })

    return activeMembers.map((member) => {
      // Include tasks where member is primary or multi-assignee
      const memberTasks = allTasks.filter((t) => {
        if (t.status === 'done' || t.status === 'rejected') return false
        if (t.assigned_to === member.id) return true
        const assignees = taskAssigneeMap[t.id]
        return assignees?.includes(member.id) ?? false
      })

      const weekHours: Record<string, number> = {}
      weeks.forEach((w) => { weekHours[w.key] = 0 })

      memberTasks.forEach((task) => {
        // Exclude tasks without deadline (consistent with workload.ts)
        const deadline = task.confirmed_deadline ?? task.desired_deadline
        if (!deadline) return

        weeks.forEach((w) => {
          if (taskOverlapsWeek(task, w.monday, w.sunday)) {
            const rawHours = getTaskWeeklyHours(task, w.key)
            // Divide by assignee count
            const assignees = taskAssigneeMap[task.id]
            const assigneeCount = assignees ? assignees.length : 1
            weekHours[w.key] += rawHours / assigneeCount
          }
        })
      })

      return {
        member,
        weekHours,
        taskCount: memberTasks.filter((t) => {
          const deadline = t.confirmed_deadline ?? t.desired_deadline
          return !!deadline
        }).length,
      }
    })
  }, [members, tasks, weeks])

  return (
    <div className="bg-surface border border-border2 rounded-[10px] shadow overflow-hidden">
      <div className="px-[12px] py-[10px] border-b border-border2 bg-surf2 flex items-center justify-between">
        <h3 className="text-[13px] font-bold text-text">{t('workload.capacityMatrix')}</h3>
        <div className="flex items-center gap-[6px]">
          <button onClick={() => setWeekOffset((o) => o - 4)} className="text-[11px] text-text2 hover:text-mint px-[6px] py-[2px] rounded border border-wf-border hover:border-mint transition-colors">&laquo;</button>
          <button onClick={() => setWeekOffset((o) => o - 1)} className="text-[11px] text-text2 hover:text-mint px-[6px] py-[2px] rounded border border-wf-border hover:border-mint transition-colors">&lsaquo;</button>
          <button onClick={() => setWeekOffset(0)} className="text-[10px] text-mint hover:text-mint-d font-medium">{t('workload.thisWeek')}</button>
          <button onClick={() => setWeekOffset((o) => o + 1)} className="text-[11px] text-text2 hover:text-mint px-[6px] py-[2px] rounded border border-wf-border hover:border-mint transition-colors">&rsaquo;</button>
          <button onClick={() => setWeekOffset((o) => o + 4)} className="text-[11px] text-text2 hover:text-mint px-[6px] py-[2px] rounded border border-wf-border hover:border-mint transition-colors">&raquo;</button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left" style={{ tableLayout: 'fixed', minWidth: 700 }}>
          <thead>
            <tr className="border-b border-border2 bg-surf2">
              <th className="px-[10px] py-[6px] text-[10px] font-semibold text-text2 w-[160px] sticky left-0 bg-surf2 z-10">{t('workload.member')}</th>
              {weeks.map((w) => (
                <th key={w.key} className={`px-[6px] py-[6px] text-[9px] font-semibold text-center ${w.isCurrent ? 'bg-mint-ll/50 dark:bg-mint-dd/20 text-mint' : 'text-text3'}`}>
                  {w.label}<br/>{w.endLabel}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.map(({ member, weekHours }) => (
              <tr key={member.id} className="border-b border-border2 hover:bg-surf2/30 transition-colors">
                <td className="px-[10px] py-[6px] sticky left-0 bg-surface z-10">
                  <div className="flex items-center gap-[6px]">
                    <Avatar name_short={member.name_short} color={member.avatar_color} avatar_url={member.avatar_url} size="sm" />
                    <div>
                      <div className="text-[11px] font-medium text-text truncate">{member.name}</div>
                      <div className="text-[9px] text-text3">{member.weekly_capacity_hours}h/w</div>
                    </div>
                  </div>
                </td>
                {weeks.map((w) => {
                  const hours = Math.round(weekHours[w.key] * 10) / 10
                  const rate = member.weekly_capacity_hours > 0 ? (hours / member.weekly_capacity_hours) * 100 : 0
                  const cellColor = getCellColor(rate)
                  return (
                    <td key={w.key} className={`px-[4px] py-[6px] text-center ${w.isCurrent ? 'bg-mint-ll/20 dark:bg-mint-dd/10' : ''}`}>
                      <div className={`text-[11px] font-bold rounded-[4px] px-[4px] py-[2px] ${cellColor}`}>
                        {hours > 0 ? `${hours}h` : '-'}
                      </div>
                      {hours > 0 && (
                        <div className="text-[8px] text-text3 mt-[1px]">{Math.round(rate)}%</div>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
