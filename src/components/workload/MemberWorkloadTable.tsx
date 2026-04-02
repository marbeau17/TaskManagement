'use client'

import { useMemo, useState } from 'react'
import { useI18n } from '@/hooks/useI18n'
import { Avatar } from '@/components/shared'
import {
  WORKLOAD_STATUS_LABELS,
  WORKLOAD_STATUS_STYLES,
  getRoleLabel,
  getRoleStyle,
} from '@/lib/constants'
import type { WorkloadSummary } from '@/types/workload'

interface MemberWorkloadTableProps {
  summaries: WorkloadSummary[]
}

/** Role sort priority — lower = earlier */
const ROLE_SORT_ORDER: Record<string, number> = {
  admin: 0,
  director: 1,
  requester: 2,
  creator: 3,
}

function roleSortKey(role: string): number {
  return ROLE_SORT_ORDER[role] ?? 99
}

function WorkloadBar({ rate }: { rate: number }) {
  const clamped = Math.min(100, Math.max(0, rate))
  let barColor = 'bg-emerald-500'
  if (rate >= 100) barColor = 'bg-red-500'
  else if (rate >= 80) barColor = 'bg-amber-500'

  return (
    <div className="w-full bg-surf2 rounded-full h-[8px] overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-300 ${barColor}`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  )
}

function StatusChipWorkload({ status }: { status: WorkloadSummary['status'] }) {
  const style = WORKLOAD_STATUS_STYLES[status]
  const label = WORKLOAD_STATUS_LABELS[status]

  return (
    <span
      className={`
        ${style.bg} ${style.text} ${style.border}
        text-[10px] px-[8px] py-[2px] rounded-full font-semibold border
        inline-block whitespace-nowrap
      `}
    >
      {label}
    </span>
  )
}

function RoleChip({ role }: { role: string }) {
  const style = getRoleStyle(role)
  const label = getRoleLabel(role)

  return (
    <span
      className={`
        ${style.bg} ${style.text} ${style.border}
        text-[10px] px-[8px] py-[2px] rounded-full font-semibold border
        inline-block whitespace-nowrap
      `}
    >
      {label}
    </span>
  )
}

export function MemberWorkloadTable({ summaries }: MemberWorkloadTableProps) {
  const { t } = useI18n()
  const [sortField, setSortField] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDir((d) => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  const sorted = useMemo(() => {
    const arr = [...summaries]
    if (!sortField) {
      // Default: sort by role then name
      return arr.sort((a, b) => {
        const roleA = roleSortKey(a.user.role)
        const roleB = roleSortKey(b.user.role)
        if (roleA !== roleB) return roleA - roleB
        return a.user.name.localeCompare(b.user.name, 'ja')
      })
    }
    const dir = sortDir === 'asc' ? 1 : -1
    return arr.sort((a, b) => {
      switch (sortField) {
        case 'name':
          return dir * a.user.name.localeCompare(b.user.name, 'ja')
        case 'role':
          return dir * (roleSortKey(a.user.role) - roleSortKey(b.user.role))
        case 'rate':
          return dir * (a.utilization_rate - b.utilization_rate)
        case 'actual':
          return dir * (a.actual_hours - b.actual_hours)
        case 'tasks':
          return dir * (a.task_count - b.task_count)
        case 'completed':
          return dir * (a.completed_count - b.completed_count)
        case 'status': {
          const statusOrder = { available: 0, normal: 1, warning: 2, overloaded: 3 }
          return dir * ((statusOrder[a.status] ?? 4) - (statusOrder[b.status] ?? 4))
        }
        default:
          return 0
      }
    })
  }, [summaries, sortField, sortDir])

  return (
    <div className="bg-surface border border-border2 rounded-[10px] overflow-hidden shadow overflow-x-auto">
      {/* ====== Mobile card view ====== */}
      <div className="md:hidden">
        {sorted.length === 0 && (
          <div className="px-[12px] py-[32px] text-center text-[12px] text-text3">
            {t('workload.noMembers')}
          </div>
        )}
        <div className="flex flex-col gap-[8px] p-[12px]">
          {sorted.map((s) => {
            const isOverloaded = s.status === 'overloaded'
            return (
              <div
                key={s.user.id}
                className={`
                  rounded-[8px] border border-border2 p-[12px]
                  ${isOverloaded ? 'bg-red-50 dark:bg-red-950/30' : 'bg-surface'}
                `}
              >
                {/* Top row: avatar + name + role */}
                <div className="flex items-center justify-between mb-[8px]">
                  <div className="flex items-center gap-[8px] min-w-0">
                    <Avatar
                      name_short={s.user.name_short}
                      color={s.user.avatar_color}
                      avatar_url={s.user.avatar_url}
                      size="sm"
                    />
                    <span className="text-[13px] font-bold text-text truncate">
                      {s.user.name}
                    </span>
                  </div>
                  <RoleChip role={s.user.role} />
                </div>

                {/* Workload bar + percentage */}
                <div className="flex items-center gap-[8px] mb-[8px]">
                  <div className="flex-1">
                    <WorkloadBar rate={s.utilization_rate} />
                  </div>
                  <span
                    className={`text-[12px] font-bold min-w-[40px] text-right ${
                      s.utilization_rate >= 100
                        ? 'text-red-600 dark:text-red-400'
                        : s.utilization_rate >= 80
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    {s.utilization_rate}%
                  </span>
                </div>

                {/* Bottom row: hours, task count, status */}
                <div className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-[12px] text-text2">
                    <span>
                      {s.estimated_hours.toFixed(1)}h / {s.capacity_hours.toFixed(1)}h
                    </span>
                    <span>
                      {t('workload.taskCount')}: {s.task_count}
                    </span>
                  </div>
                  <StatusChipWorkload status={s.status} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ====== Desktop grid view ====== */}
      {/* Header */}
      <div className="hidden md:grid min-w-[700px] grid-cols-[1fr_80px_160px_70px_100px_60px_60px_80px] gap-[8px] px-[16px] py-[10px] bg-surf2 border-b border-border2 text-[10.5px] font-bold text-text2">
        {([
          { label: t('workload.member'), field: 'name', align: '' },
          { label: t('workload.role'), field: 'role', align: 'text-center' },
          { label: t('workload.bar'), field: 'rate', align: '' },
          { label: t('workload.rate'), field: 'rate', align: 'text-right' },
          { label: t('workload.actualEstimated'), field: 'actual', align: 'text-right' },
          { label: t('workload.taskCount'), field: 'tasks', align: 'text-center' },
          { label: t('workload.completedCount'), field: 'completed', align: 'text-center' },
          { label: t('workload.status'), field: 'status', align: 'text-center' },
        ] as const).map(({ label, field, align }) => (
          <div
            key={`${field}-${label}`}
            onClick={() => handleSort(field)}
            className={`cursor-pointer hover:text-mint select-none transition-colors ${align}`}
          >
            <span className="inline-flex items-center gap-[3px]">
              {label}
              {sortField === field ? (
                <span className="text-mint text-[9px]">{sortDir === 'asc' ? '\u25B2' : '\u25BC'}</span>
              ) : (
                <span className="text-text3/40 text-[8px]">{'\u25B4\u25BE'}</span>
              )}
            </span>
          </div>
        ))}
      </div>

      {/* Rows */}
      {sorted.map((s) => {
        const isOverloaded = s.status === 'overloaded'
        return (
          <div
            key={s.user.id}
            className={`
              hidden md:grid min-w-[700px] grid-cols-[1fr_80px_160px_70px_100px_60px_60px_80px] gap-[8px] px-[16px] py-[10px]
              border-b border-border2 last:border-b-0 items-center text-[12px] text-text
              ${isOverloaded ? 'bg-red-50 dark:bg-red-950/30' : 'hover:bg-surf2/50'}
              transition-colors
            `}
          >
            {/* Name */}
            <div className="flex items-center gap-[8px]">
              <Avatar
                name_short={s.user.name_short}
                color={s.user.avatar_color}
                avatar_url={s.user.avatar_url}
                size="sm"
              />
              <span className="text-[12px] font-medium truncate">
                {s.user.name}
              </span>
            </div>

            {/* Role */}
            <div className="text-center">
              <RoleChip role={s.user.role} />
            </div>

            {/* Workload bar */}
            <div className="flex items-center">
              <WorkloadBar rate={s.utilization_rate} />
            </div>

            {/* Utilization rate */}
            <div
              className={`text-right font-bold text-[12px] ${
                s.utilization_rate >= 100
                  ? 'text-red-600 dark:text-red-400'
                  : s.utilization_rate >= 80
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-emerald-600 dark:text-emerald-400'
              }`}
            >
              {s.utilization_rate}%
            </div>

            {/* Actual / Estimated */}
            <div className="text-right text-[11px] text-text2">
              {s.estimated_hours.toFixed(1)}h / {s.capacity_hours.toFixed(1)}h
            </div>

            {/* Task count */}
            <div className="text-center text-[12px]">{s.task_count}</div>

            {/* Completed count */}
            <div className="text-center text-[12px]">{s.completed_count}</div>

            {/* Status chip */}
            <div className="text-center">
              <StatusChipWorkload status={s.status} />
            </div>
          </div>
        )
      })}

      {sorted.length === 0 && (
        <div className="hidden md:block px-[16px] py-[32px] text-center text-[12px] text-text3">
          {t('workload.noMembers')}
        </div>
      )}
    </div>
  )
}
