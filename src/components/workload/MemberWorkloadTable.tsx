'use client'

import { Avatar } from '@/components/shared'
import {
  WORKLOAD_STATUS_LABELS,
  WORKLOAD_STATUS_STYLES,
} from '@/lib/constants'
import type { WorkloadSummary } from '@/types/workload'

interface MemberWorkloadTableProps {
  summaries: WorkloadSummary[]
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

export function MemberWorkloadTable({ summaries }: MemberWorkloadTableProps) {
  return (
    <div className="bg-surface border border-border2 rounded-[10px] overflow-hidden shadow">
      {/* Header */}
      <div className="grid grid-cols-[1fr_160px_70px_100px_60px_60px_80px] gap-[8px] px-[16px] py-[10px] bg-surf2 border-b border-border2 text-[10.5px] font-bold text-text2">
        <div>担当者</div>
        <div>稼働バー</div>
        <div className="text-right">稼働率</div>
        <div className="text-right">実績/見積</div>
        <div className="text-center">タスク</div>
        <div className="text-center">完了</div>
        <div className="text-center">状態</div>
      </div>

      {/* Rows */}
      {summaries.map((s) => {
        const isOverloaded = s.status === 'overloaded'
        return (
          <div
            key={s.user.id}
            className={`
              grid grid-cols-[1fr_160px_70px_100px_60px_60px_80px] gap-[8px] px-[16px] py-[10px]
              border-b border-border2 last:border-b-0 items-center text-[12px] text-text
              ${isOverloaded ? 'bg-red-50' : 'hover:bg-surf2/50'}
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

            {/* Workload bar */}
            <div className="flex items-center">
              <WorkloadBar rate={s.utilization_rate} />
            </div>

            {/* Utilization rate */}
            <div
              className={`text-right font-bold text-[12px] ${
                s.utilization_rate >= 100
                  ? 'text-red-600'
                  : s.utilization_rate >= 80
                    ? 'text-amber-600'
                    : 'text-emerald-600'
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
        )
      })}

      {summaries.length === 0 && (
        <div className="px-[16px] py-[32px] text-center text-[12px] text-text3">
          メンバーデータがありません
        </div>
      )}
    </div>
  )
}
