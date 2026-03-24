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
import { WORKLOAD_THRESHOLDS } from '@/lib/constants'
import type { TaskWithRelations } from '@/types/database'
import type { TaskFormStep2 } from '@/types/task'

// ---------------------------------------------------------------------------
// Validation schema
// ---------------------------------------------------------------------------

const schema = z.object({
  assigned_to: z.string().min(1, 'クリエイターを選択してください'),
  confirmed_deadline: z.string().min(1, '確定納期は必須です'),
  estimated_hours: z
    .number({ error: '見積時間を入力してください' })
    .min(0.5, '0.5h以上を入力してください'),
})

type FormValues = z.infer<typeof schema>

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
  const { data: members } = useMembers()
  const { data: workloads } = useWorkloadSummaries()
  const assignTask = useAssignTask()
  const [successMessage, setSuccessMessage] = useState(false)

  // Filter to creator-role members only
  const creators = useMemo(() => {
    if (!members) return []
    return members.filter((m) => m.role === 'creator' && m.is_active)
  }, [members])

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
    watch,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      assigned_to: task.assigned_to ?? '',
      confirmed_deadline: task.confirmed_deadline ?? task.desired_deadline ?? '',
      estimated_hours: task.estimated_hours ?? (undefined as unknown as number),
    },
    mode: 'onTouched',
  })

  const watchedAssignee = watch('assigned_to')
  const watchedHours = watch('estimated_hours')

  // Compute projected workload for selected creator
  const workloadPreview = useMemo(() => {
    if (!watchedAssignee) return null
    const current = workloadMap.get(watchedAssignee)
    if (!current) return null

    const addedHours = watchedHours && !isNaN(watchedHours) ? watchedHours : 0
    const projectedHours = current.estimated_hours + addedHours
    const projectedRate =
      current.capacity_hours > 0
        ? Math.round((projectedHours / current.capacity_hours) * 100)
        : 0

    return {
      currentRate: current.utilization_rate,
      projectedRate,
      currentHours: current.estimated_hours,
      projectedHours,
      capacityHours: current.capacity_hours,
    }
  }, [watchedAssignee, watchedHours, workloadMap])

  const onSubmit = (values: FormValues) => {
    const step2: TaskFormStep2 = {
      assigned_to: values.assigned_to,
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
            アサイン変更
          </DialogTitle>
          <DialogDescription className="text-[12px] text-text3">
            {task.title} のアサイン情報を変更します
          </DialogDescription>
        </DialogHeader>

        {/* Success feedback */}
        {successMessage && (
          <div className="rounded-lg bg-ok-bg border border-ok-b px-4 py-3 text-[12px] text-ok font-semibold text-center">
            アサインを変更しました
          </div>
        )}

        {/* Current assignment info */}
        {task.assigned_user && (
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-surf2 border border-wf-border">
            <Avatar
              name_short={task.assigned_user.name_short}
              color={task.assigned_user.avatar_color}
              size="sm"
            />
            <div>
              <span className="text-[12px] font-semibold text-text">
                現在: {task.assigned_user.name}
              </span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Creator select */}
          <div>
            <label
              htmlFor="modal_assigned_to"
              className="block text-[12.5px] font-semibold text-text2 mb-1.5"
            >
              担当クリエイター <span className="text-danger">*</span>
            </label>
            <select
              id="modal_assigned_to"
              className={`
                w-full rounded-lg border px-3 py-2 text-[13px] text-text1
                bg-surface
                focus:outline-none focus:ring-2 focus:ring-mint/40 focus:border-mint
                ${errors.assigned_to ? 'border-danger' : 'border-wf-border'}
              `}
              {...register('assigned_to')}
            >
              <option value="">選択してください</option>
              {creators.map((c) => {
                const wl = workloadMap.get(c.id)
                const rate = wl ? wl.utilization_rate : 0
                return (
                  <option key={c.id} value={c.id}>
                    {c.name}（稼働率 {rate}%）
                  </option>
                )
              })}
            </select>
            {errors.assigned_to && (
              <p className="mt-1 text-[11px] text-danger">
                {errors.assigned_to.message}
              </p>
            )}
          </div>

          {/* Workload preview */}
          {workloadPreview && (
            <div
              className={`rounded-lg p-3 border ${getUtilBg(workloadPreview.projectedRate)} border-wf-border`}
            >
              <p className="text-[11px] font-semibold text-text2 mb-2">
                稼働率プレビュー
              </p>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-text3">現在</span>
                  <span className={`font-bold ${getUtilColor(workloadPreview.currentRate)}`}>
                    {workloadPreview.currentRate}%
                  </span>
                </div>
                <ProgressBar value={workloadPreview.currentRate} height="sm" />
                <div className="flex items-center justify-center text-text3 text-[11px]">
                  → +{watchedHours && !isNaN(watchedHours) ? watchedHours : 0}h
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-text3">見込み</span>
                  <span className={`font-bold ${getUtilColor(workloadPreview.projectedRate)}`}>
                    {workloadPreview.projectedRate}%
                  </span>
                </div>
                <ProgressBar value={Math.min(workloadPreview.projectedRate, 100)} height="sm" />
                {workloadPreview.projectedRate >= WORKLOAD_THRESHOLDS.danger && (
                  <p className="text-[10px] text-danger font-semibold mt-1">
                    キャパシティを超過します（{workloadPreview.projectedHours}h / {workloadPreview.capacityHours}h）
                  </p>
                )}
                {workloadPreview.projectedRate >= WORKLOAD_THRESHOLDS.warning &&
                  workloadPreview.projectedRate < WORKLOAD_THRESHOLDS.danger && (
                    <p className="text-[10px] text-warn font-semibold mt-1">
                      稼働率が高くなっています（{workloadPreview.projectedHours}h / {workloadPreview.capacityHours}h）
                    </p>
                  )}
              </div>
            </div>
          )}

          {/* Confirmed deadline */}
          <div>
            <label
              htmlFor="modal_confirmed_deadline"
              className="block text-[12.5px] font-semibold text-text2 mb-1.5"
            >
              確定納期 <span className="text-danger">*</span>
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
              見積工数（h） <span className="text-danger">*</span>
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
                  placeholder="例: 8"
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
              キャンセル
            </button>
            <button
              type="submit"
              disabled={assignTask.isPending}
              className="flex-1 py-2 rounded-lg text-[12px] font-semibold text-white bg-mint hover:bg-mint-d transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {assignTask.isPending ? '変更中...' : 'アサインを変更する'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
