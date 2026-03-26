'use client'

import { useMemo } from 'react'
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
  let barColor = 'bg-emerald-500 dark:bg-emerald-400'
  if (rate >= 100) barColor = 'bg-red-500 dark:bg-red-400'
  else if (rate >= 80) barColor = 'bg-amber-500 dark:bg-amber-400'

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
  const sorted = useMemo(() => {
    return [...summaries].sort((a, b) => {
      const roleA = roleSortKey(a.user.role)
      const roleB = roleSortKey(b.user.role)
      if (roleA !== roleB) return roleA - roleB
      return a.user.name.localeCompare(b.user.name, 'ja')
    })
  }, [summaries])

  return (
    <div className="bg-surface border border-border2 rounded-[10px] overflow-hidden shadow overflow-x-auto">
      {/* Desktop Header */}
      <div className="hidden md:grid min-w-[700px] grid-cols-[1fr_80px_160px_70px_100px_60px_60px_80px] gap-[8px] px-[16px] py-[10px] bg-surf2 border-b border-border2 text-[10.5px] font-bold text-text2">
        <div>担当者</div>
        <div className="text-center">ロール</div>
        <div>稼働バー</div>
        <div className="text-right">稼働率</div>
        <div className="text-right">実績/見積</div>
        <div className="text-center">タスク</div>
        <div className="text-center">完了</div>
        <div className="text-center">状態</div>
      </div>

      {/* Rows */}
      {sorted.map((s) => {
        const isOverloaded = s.status === 'overloaded'
        return (
          <div key={s.user.id}>
            {/* Mobile card layout */}
            <div
              className={`
                md:hidden px-[16px] py-[12px] border-b border-border2 last:border-b-0 space-y-[8px]
                ${isOverloaded ? 'bg-red-50 dark:bg-red-950/30' : ''}
              `}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-[8px]">
                  <Avatar
                    name_short={s.user.name_short}
                    color={s.user.avatar_color}
                    size="sm"
                  />
                  <span className="text-[12px] font-medium truncate text-text">
                    {s.user.name}
                  </span>
                  <RoleChip role={s.user.role} />
                </div>
                <StatusChipWorkload status={s.status} />
              </div>
              <div className="flex items-center gap-[8px]">
                <div className="flex-1">
                  <WorkloadBar rate={s.utilization_rate} />
                </div>
                <span
                  className={`text-[12px] font-bold shrink-0 ${
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
              <div className="flex items-center gap-[12px] text-[11px] text-text2">
                <span>{s.actual_hours.toFixed(1)}h / {s.estimated_hours.toFixed(1)}h</span>
                <span>タスク: {s.task_count}</span>
                <span>完了: {s.completed_count}</span>
              </div>
            </div>

            {/* Desktop grid layout */}
            <div
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
                {s.actual_hours.toFixed(1)}h / {s.estimated_hours.toFixed(1)}h
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
          </div>
        )
      })}

      {sorted.length === 0 && (
        <div className="px-[16px] py-[32px] text-center text-[12px] text-text3">
          メンバーデータがありません
        </div>
      )}
    </div>
  )
}
