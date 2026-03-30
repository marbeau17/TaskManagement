'use client'

import { useState } from 'react'
import type { TaskWithRelations } from '@/types/database'
import { Avatar, RoleChip } from '@/components/shared'
import { AssignChangeModal } from '@/components/tasks/AssignChangeModal'
import { useTaskAssignees, useRemoveTaskAssignee, useUpdateTaskAssigneeHours } from '@/hooks/useTaskAssignees'
import { useI18n } from '@/hooks/useI18n'

interface AssignInfoProps {
  task: TaskWithRelations
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
}

export function AssignInfo({ task }: AssignInfoProps) {
  const { t } = useI18n()
  const [assignModalOpen, setAssignModalOpen] = useState(false)
  const { data: assignees } = useTaskAssignees(task.id)
  const removeAssignee = useRemoveTaskAssignee()
  const updateHours = useUpdateTaskAssigneeHours()

  // Fallback: if no assignees from task_assignees yet, show legacy assigned_user
  const legacyUser = task.assigned_user
  const hasAssignees = assignees && assignees.length > 0
  const estimatedHours = task.estimated_hours ?? 0
  const maxHours = Math.max(estimatedHours, task.actual_hours, 1)

  return (
    <div className="bg-surface rounded-lg border border-wf-border p-5">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-[13px] font-bold text-text">
          {'⚙ '}{t('assignInfo.title')}
        </h3>
        <span className="text-[9.5px] px-[7px] py-[1px] rounded-full font-bold border inline-block bg-warn-bg text-warn border-warn-b">
          {t('assignInfo.adminDir')}
        </span>
      </div>

      {hasAssignees ? (
        <>
          {/* Assignee list */}
          <div className="space-y-3 mb-4">
            {assignees.map((assignee) => {
              const user = assignee.user
              if (!user) return null
              return (
                <div key={assignee.id} className="flex items-center gap-3">
                  <Avatar
                    name_short={user.name_short}
                    color={user.avatar_color}
                    size="lg"
                  />
                  <div className="flex flex-col flex-1">
                    <span className="text-[14px] font-bold text-text">
                      {user.name}
                    </span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <RoleChip role={user.role} />
                      <span className="text-[10px] px-[6px] py-[1px] rounded-full bg-info-bg text-info border border-info-b font-semibold">
                        {t('assignInfo.weeklyHours')}{user.weekly_capacity_hours}h
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-[4px] ml-auto">
                    <input
                      type="number"
                      min={0}
                      step={0.5}
                      value={assignee.allocated_hours || ''}
                      placeholder="0"
                      onChange={(e) => {
                        const hours = parseFloat(e.target.value) || 0
                        updateHours.mutate({
                          taskId: task.id,
                          userId: user.id,
                          hours,
                        })
                      }}
                      className="w-[50px] text-[11px] text-text text-center bg-surface border border-wf-border rounded px-1 py-0.5 focus:outline-none focus:border-mint"
                      title={t('workload.allocatedHours')}
                    />
                    <span className="text-[9px] text-text3">h</span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      removeAssignee.mutate({
                        taskId: task.id,
                        userId: user.id,
                      })
                    }
                    className="text-[16px] text-text3 hover:text-danger transition-colors leading-none px-1"
                    title={t('assignInfo.removeAssign')}
                  >
                    ×
                  </button>
                </div>
              )
            })}
          </div>

          {/* Hours comparison */}
          <div className="mb-4">
            <div className="flex justify-between text-[11px] text-text2 mb-1.5">
              <span>{t('assignInfo.estimated')}: {estimatedHours}h</span>
              <span>{t('assignInfo.actual')}: {task.actual_hours}h</span>
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
      ) : legacyUser ? (
        <>
          {/* Legacy single assignee (backward compat) */}
          <div className="flex items-center gap-3 mb-4">
            <Avatar
              name_short={legacyUser.name_short}
              color={legacyUser.avatar_color}
              size="lg"
            />
            <div className="flex flex-col">
              <span className="text-[14px] font-bold text-text">
                {legacyUser.name}
              </span>
              <div className="flex items-center gap-2 mt-0.5">
                <RoleChip role={legacyUser.role} />
                <span className="text-[10px] px-[6px] py-[1px] rounded-full bg-info-bg text-info border border-info-b font-semibold">
                  {t('assignInfo.weeklyHours')}{legacyUser.weekly_capacity_hours}h
                </span>
              </div>
            </div>
          </div>

          {/* Hours comparison */}
          <div className="mb-4">
            <div className="flex justify-between text-[11px] text-text2 mb-1.5">
              <span>{t('assignInfo.estimated')}: {estimatedHours}h</span>
              <span>{t('assignInfo.actual')}: {task.actual_hours}h</span>
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
        <p className="text-[12px] text-text3 mb-4">{t('assignInfo.unassigned')}</p>
      )}

      {/* Deadlines */}
      <div className="flex gap-4 mb-4 text-[12px]">
        <div>
          <span className="text-text3 block mb-0.5">{t('assign.desiredDeadline')}</span>
          <span className="text-text font-semibold">
            {formatDate(task.desired_deadline)}
          </span>
        </div>
        <div>
          <span className="text-text3 block mb-0.5">{t('assign.confirmedDeadline')}</span>
          <span className="text-text font-semibold">
            {formatDate(task.confirmed_deadline)}
          </span>
        </div>
      </div>

      {/* Change assignee button */}
      <button
        type="button"
        onClick={() => setAssignModalOpen(true)}
        className="w-full py-2 rounded-md text-[12px] font-bold border border-mint text-mint bg-surface hover:bg-mint-ll transition-colors"
      >
        {t('assignInfo.changeAssign')}
      </button>

      <AssignChangeModal
        open={assignModalOpen}
        onOpenChange={setAssignModalOpen}
        task={task}
      />
    </div>
  )
}
