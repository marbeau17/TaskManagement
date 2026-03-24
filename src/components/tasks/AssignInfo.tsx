'use client'

import type { TaskWithRelations } from '@/types/database'
import { Avatar, RoleChip } from '@/components/shared'

interface AssignInfoProps {
  task: TaskWithRelations
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
}

export function AssignInfo({ task }: AssignInfoProps) {
  const user = task.assigned_user
  const estimatedHours = task.estimated_hours ?? 0
  const maxHours = Math.max(estimatedHours, task.actual_hours, 1)

  return (
    <div className="bg-surface rounded-lg border border-wf-border p-5">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-[13px] font-bold text-text">
          {'⚙ アサイン情報'}
        </h3>
        <span className="text-[9.5px] px-[7px] py-[1px] rounded-full font-bold border inline-block bg-warn-bg text-warn border-warn-b">
          管理者/Dir
        </span>
      </div>

      {user ? (
        <>
          {/* Assignee profile */}
          <div className="flex items-center gap-3 mb-4">
            <Avatar
              name_short={user.name_short}
              color={user.avatar_color}
              size="lg"
            />
            <div className="flex flex-col">
              <span className="text-[14px] font-bold text-text">
                {user.name}
              </span>
              <div className="flex items-center gap-2 mt-0.5">
                <RoleChip role={user.role} />
                <span className="text-[10px] px-[6px] py-[1px] rounded-full bg-info-bg text-info border border-info-b font-semibold">
                  週{user.weekly_capacity_hours}h
                </span>
              </div>
            </div>
          </div>

          {/* Hours comparison */}
          <div className="mb-4">
            <div className="flex justify-between text-[11px] text-text2 mb-1.5">
              <span>見積: {estimatedHours}h</span>
              <span>実績: {task.actual_hours}h</span>
            </div>
            <div className="relative w-full bg-surf2 rounded-full" style={{ height: 8 }}>
              <div
                className="absolute h-full rounded-full bg-mint-l opacity-50"
                style={{
                  width: `${(estimatedHours / maxHours) * 100}%`,
                }}
              />
              <div
                className="absolute h-full rounded-full"
                style={{
                  width: `${(task.actual_hours / maxHours) * 100}%`,
                  backgroundColor:
                    task.actual_hours > estimatedHours
                      ? 'var(--color-danger)'
                      : 'var(--color-mint)',
                }}
              />
            </div>
          </div>
        </>
      ) : (
        <p className="text-[12px] text-text3 mb-4">未アサイン</p>
      )}

      {/* Deadlines */}
      <div className="flex gap-4 mb-4 text-[12px]">
        <div>
          <span className="text-text3 block mb-0.5">希望納期</span>
          <span className="text-text font-semibold">
            {formatDate(task.desired_deadline)}
          </span>
        </div>
        <div>
          <span className="text-text3 block mb-0.5">確定納期</span>
          <span className="text-text font-semibold">
            {formatDate(task.confirmed_deadline)}
          </span>
        </div>
      </div>

      {/* Change assignee button */}
      <button
        type="button"
        className="w-full py-2 rounded-md text-[12px] font-bold border border-mint text-mint bg-surface hover:bg-mint-ll transition-colors"
      >
        アサイン変更
      </button>
    </div>
  )
}
