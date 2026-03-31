'use client'

import { useMemo, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Avatar, ProgressBar } from '@/components/shared'
import { useMembers } from '@/hooks/useMembers'
import { useWorkloadSummaries } from '@/hooks/useWorkload'
import { useAssignTask } from '@/hooks/useTasks'
import {
  useTaskAssignees,
  useAddTaskAssignee,
  useRemoveTaskAssignee,
} from '@/hooks/useTaskAssignees'
import { WORKLOAD_THRESHOLDS } from '@/lib/constants'
import { useI18n } from '@/hooks/useI18n'
import type { TaskWithRelations } from '@/types/database'
import type { TaskFormStep2 } from '@/types/task'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface AssignChangeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  task: TaskWithRelations
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getUtilColor(rate: number): string {
  if (rate >= WORKLOAD_THRESHOLDS.danger) return 'text-danger'
  if (rate >= WORKLOAD_THRESHOLDS.warning) return 'text-warn'
  return 'text-ok'
}

function getUtilBg(rate: number): string {
  if (rate >= WORKLOAD_THRESHOLDS.danger) return 'bg-danger-bg'
  if (rate >= WORKLOAD_THRESHOLDS.warning) return 'bg-warn-bg'
  return 'bg-ok-bg'
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AssignChangeModal({
  open,
  onOpenChange,
  task,
}: AssignChangeModalProps) {
  const { t } = useI18n()
  const { data: members } = useMembers()
  const { data: workloads } = useWorkloadSummaries()
  const { data: assignees } = useTaskAssignees(task.id)
  const addAssignee = useAddTaskAssignee()
  const removeAssignee = useRemoveTaskAssignee()
  const assignTask = useAssignTask()
  const [successMessage, setSuccessMessage] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState('')

  // Validation schema (inside component to use t())
  const schema = useMemo(() => z.object({
    confirmed_deadline: z.string().min(1, t('assign.validation.deadlineRequired')),
    estimated_hours: z
      .number({ error: t('assign.validation.enterEstimatedHours') })
      .min(0.5, t('assign.validation.minHours')),
  }), [t])

  type FormValues = z.infer<typeof schema>

  // All active members can be assigned
  const creators = useMemo(() => {
    if (!members) return []
    return members.filter((m) => m.is_active)
  }, [members])

  // IDs of currently assigned users
  const assignedUserIds = useMemo(() => {
    if (!assignees) return new Set<string>()
    return new Set(assignees.map((a) => a.user_id))
  }, [assignees])

  // Creators not yet assigned
  const availableCreators = useMemo(() => {
    return creators.filter((c) => !assignedUserIds.has(c.id))
  }, [creators, assignedUserIds])

  // Workload lookup by user id
  const workloadMap = useMemo(() => {
    const map = new Map<
      string,
      { utilization_rate: number; estimated_hours: number; capacity_hours: number }
    >()
    if (workloads) {
      for (const w of workloads) {
        map.set(w.user.id, {
          utilization_rate: w.utilization_rate,
          estimated_hours: w.estimated_hours,
          capacity_hours: w.capacity_hours,
        })
      }
    }
    return map
  }, [workloads])

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      confirmed_deadline: task.confirmed_deadline ?? task.desired_deadline ?? '',
      estimated_hours: task.estimated_hours ?? (undefined as unknown as number),
    },
    mode: 'onTouched',
  })

  // Preview workload for selected user in the dropdown
  const selectedWorkloadPreview = useMemo(() => {
    if (!selectedUserId) return null
    const current = workloadMap.get(selectedUserId)
    if (!current) return null
    return {
      currentRate: current.utilization_rate,
      currentHours: current.estimated_hours,
      capacityHours: current.capacity_hours,
    }
  }, [selectedUserId, workloadMap])

  const handleAddAssignee = () => {
    if (!selectedUserId) return
    addAssignee.mutate(
      { taskId: task.id, userId: selectedUserId },
      {
        onSuccess: () => {
          setSelectedUserId('')
        },
      }
    )
  }

  const handleRemoveAssignee = (userId: string) => {
    removeAssignee.mutate({ taskId: task.id, userId })
  }

  const onSubmit = (values: FormValues) => {
    // Use the most recently added assignee, or fallback to first/existing
    const primaryAssignee = assignees && assignees.length > 0
      ? assignees[assignees.length - 1].user_id
      : task.assigned_to ?? ''

    const step2: TaskFormStep2 = {
      assigned_to: primaryAssignee,
      confirmed_deadline: values.confirmed_deadline,
      estimated_hours: values.estimated_hours,
    }

    assignTask.mutate(
      { taskId: task.id, step2 },
      {
        onSuccess: () => {
          setSuccessMessage(true)
          setTimeout(() => {
            setSuccessMessage(false)
            onOpenChange(false)
          }, 1200)
        },
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[15px] font-bold text-text">
            {t('assignChange.title')}
          </DialogTitle>
          <DialogDescription className="text-[12px] text-text3">
            {task.title} {t('assignChange.description')}
          </DialogDescription>
        </DialogHeader>

        {/* Success feedback */}
        {successMessage && (
          <div className="rounded-lg bg-ok-bg border border-ok-b px-4 py-3 text-[12px] text-ok font-semibold text-center">
            {t('assignChange.success')}
          </div>
        )}

        {/* Current assignees list */}
        {assignees && assignees.length > 0 && (
          <div className="space-y-2">
            <p className="text-[12px] font-semibold text-text2">
              {t('assignChange.currentAssignees')} ({assignees.length}{t('assignChange.members')})
            </p>
            {assignees.map((assignee) => {
              const user = assignee.user
              if (!user) return null
              return (
                <div
                  key={assignee.id}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-surf2 border border-wf-border"
                >
                  <Avatar
                    name_short={user.name_short}
                    color={user.avatar_color}
                    avatar_url={user.avatar_url}
                    size="sm"
                  />
                  <span className="text-[12px] font-semibold text-text flex-1">
                    {user.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveAssignee(user.id)}
                    disabled={removeAssignee.isPending}
                    className="text-[14px] text-text3 hover:text-danger transition-colors leading-none px-1 disabled:opacity-50"
                    title={t('assignChange.removeAssign')}
                  >
                    ×
                  </button>
                </div>
              )
            })}
          </div>
        )}

        {/* Add assignee section */}
        <div className="space-y-2">
          <p className="text-[12px] font-semibold text-text2">
            {t('assignChange.addMember')}
          </p>
          <div className="flex items-center gap-2">
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="flex-1 rounded-lg border border-wf-border px-3 py-2 text-[13px] text-text1 bg-surface focus:outline-none focus:ring-2 focus:ring-mint/40 focus:border-mint"
            >
              <option value="">{t('assign.selectPlaceholder')}</option>
              {availableCreators.map((c) => {
                const wl = workloadMap.get(c.id)
                const rate = wl ? wl.utilization_rate : 0
                return (
                  <option key={c.id} value={c.id}>
                    {c.name}({t('assign.utilizationRate')} {rate}%)
                  </option>
                )
              })}
            </select>
            <button
              type="button"
              onClick={handleAddAssignee}
              disabled={!selectedUserId || addAssignee.isPending}
              className="px-4 py-2 rounded-lg text-[12px] font-semibold text-white bg-mint hover:bg-mint-d transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {addAssignee.isPending ? t('assignChange.adding') : t('common.add')}
            </button>
          </div>

          {/* Workload preview for selected user */}
          {selectedWorkloadPreview && (
            <div
              className={`rounded-lg p-3 border ${getUtilBg(selectedWorkloadPreview.currentRate)} border-wf-border`}
            >
              <p className="text-[11px] font-semibold text-text2 mb-2">
                {t('assign.workloadPreview')}
              </p>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-text3">{t('assign.currentUtilization')}</span>
                  <span className={`font-bold ${getUtilColor(selectedWorkloadPreview.currentRate)}`}>
                    {selectedWorkloadPreview.currentRate}%
                  </span>
                </div>
                <ProgressBar value={selectedWorkloadPreview.currentRate} height="sm" />
                <div className="text-[10px] text-text3">
                  {selectedWorkloadPreview.currentHours}h / {selectedWorkloadPreview.capacityHours}h
                </div>
                {selectedWorkloadPreview.currentRate >= WORKLOAD_THRESHOLDS.danger && (
                  <p className="text-[10px] text-danger font-semibold mt-1">
                    {t('assignChange.capacityExceeded')}
                  </p>
                )}
                {selectedWorkloadPreview.currentRate >= WORKLOAD_THRESHOLDS.warning &&
                  selectedWorkloadPreview.currentRate < WORKLOAD_THRESHOLDS.danger && (
                    <p className="text-[10px] text-warn font-semibold mt-1">
                      {t('assign.highUtilization')}
                    </p>
                  )}
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Confirmed deadline */}
          <div>
            <label
              htmlFor="modal_confirmed_deadline"
              className="block text-[12.5px] font-semibold text-text2 mb-1.5"
            >
              {t('assign.confirmedDeadline')} <span className="text-danger">*</span>
            </label>
            <input
              id="modal_confirmed_deadline"
              type="date"
              className={`
                w-full rounded-lg border px-3 py-2 text-[13px] text-text1
                bg-surface
                focus:outline-none focus:ring-2 focus:ring-mint/40 focus:border-mint
                ${errors.confirmed_deadline ? 'border-danger' : 'border-wf-border'}
              `}
              {...register('confirmed_deadline')}
            />
            {errors.confirmed_deadline && (
              <p className="mt-1 text-[11px] text-danger">
                {errors.confirmed_deadline.message}
              </p>
            )}
          </div>

          {/* Estimated hours */}
          <div>
            <label
              htmlFor="modal_estimated_hours"
              className="block text-[12.5px] font-semibold text-text2 mb-1.5"
            >
              {t('assignChange.estimatedHours')} <span className="text-danger">*</span>
            </label>
            <Controller
              control={control}
              name="estimated_hours"
              render={({ field }) => (
                <input
                  id="modal_estimated_hours"
                  type="number"
                  step={0.5}
                  min={0.5}
                  placeholder={t('assign.estimatedHoursPlaceholder')}
                  className={`
                    w-full rounded-lg border px-3 py-2 text-[13px] text-text1
                    bg-surface placeholder:text-text3
                    focus:outline-none focus:ring-2 focus:ring-mint/40 focus:border-mint
                    ${errors.estimated_hours ? 'border-danger' : 'border-wf-border'}
                  `}
                  value={field.value ?? ''}
                  onChange={(e) => {
                    const val = e.target.value
                    field.onChange(val === '' ? undefined : parseFloat(val))
                  }}
                  onBlur={field.onBlur}
                />
              )}
            />
            {errors.estimated_hours && (
              <p className="mt-1 text-[11px] text-danger">
                {errors.estimated_hours.message}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="flex-1 py-2 rounded-lg text-[12px] font-semibold text-text2 bg-surf2 border border-wf-border hover:bg-wf-border transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={assignTask.isPending}
              className="flex-1 py-2 rounded-lg text-[12px] font-semibold text-white bg-mint hover:bg-mint-d transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {assignTask.isPending ? t('assignChange.saving') : t('assignChange.save')}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
