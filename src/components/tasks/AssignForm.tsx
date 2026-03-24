'use client'

import { useMemo } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod/v4'
import type { TaskFormStep1, TaskFormStep2 } from '@/types/task'
import { useMembers } from '@/hooks/useMembers'
import { useWorkloadSummaries } from '@/hooks/useWorkload'
import { Avatar, ProgressBar } from '@/components/shared'
import { WORKLOAD_THRESHOLDS } from '@/lib/constants'

// ---------------------------------------------------------------------------
// Zod schema for Step 2
// ---------------------------------------------------------------------------

const step2Schema = z.object({
  assigned_to: z.string().min(1, 'クリエイターを選択してください'),
  confirmed_deadline: z.string().min(1, '確定納期は必須です'),
  estimated_hours: z
    .number({ error: '見積時間を入力してください' })
    .min(0.5, '0.5h以上を入力してください'),
})

type Step2FormValues = z.infer<typeof step2Schema>

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface AssignFormProps {
  step1Data: TaskFormStep1
  onBack: () => void
  onSkip: (step1Data: TaskFormStep1) => void
  onSubmit: (data: TaskFormStep2) => void
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

export function AssignForm({
  step1Data,
  onBack,
  onSkip,
  onSubmit,
}: AssignFormProps) {
  const { data: members } = useMembers()
  const { data: workloads } = useWorkloadSummaries()

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
  } = useForm<Step2FormValues>({
    resolver: zodResolver(step2Schema),
    defaultValues: {
      assigned_to: '',
      confirmed_deadline: step1Data.desired_deadline ?? '',
      estimated_hours: undefined as unknown as number,
    },
    mode: 'onTouched',
  })

  const watchedAssignee = watch('assigned_to')
  const watchedHours = watch('estimated_hours')
  const watchedDeadline = watch('confirmed_deadline')

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

  // Deadline warning
  const deadlineWarning = useMemo(() => {
    if (!step1Data.desired_deadline || !watchedDeadline) return false
    return watchedDeadline < step1Data.desired_deadline
  }, [step1Data.desired_deadline, watchedDeadline])

  const submit = (values: Step2FormValues) => {
    onSubmit({
      assigned_to: values.assigned_to,
      confirmed_deadline: values.confirmed_deadline,
      estimated_hours: values.estimated_hours,
    })
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-6">
      {/* Step 1 summary (read-only) */}
      <div className="bg-surface rounded-xl border border-wf-border shadow-sm">
        <div className="px-6 py-4 border-b border-wf-border">
          <h2 className="text-[15px] font-bold text-text1">
            📋 依頼情報サマリー
          </h2>
        </div>
        <div className="px-6 py-4 space-y-2 text-[13px]">
          <SummaryRow label="クライアント" value={step1Data.client_name} />
          <SummaryRow label="タスク名" value={step1Data.title} />
          {step1Data.description && (
            <SummaryRow label="説明" value={step1Data.description} />
          )}
          {step1Data.desired_deadline && (
            <SummaryRow label="希望納期" value={step1Data.desired_deadline} />
          )}
          {step1Data.reference_url && (
            <SummaryRow label="参考URL" value={step1Data.reference_url} isUrl />
          )}
        </div>
      </div>

      {/* Assign settings */}
      <div className="bg-surface rounded-xl border border-wf-border shadow-sm">
        <div className="px-6 py-4 border-b border-wf-border">
          <h2 className="text-[15px] font-bold text-text1">
            🎯 アサイン設定
          </h2>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Creator select */}
          <div>
            <label
              htmlFor="assigned_to"
              className="block text-[12.5px] font-semibold text-text2 mb-1.5"
            >
              クリエイター <span className="text-danger">*</span>
            </label>
            <select
              id="assigned_to"
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

          {/* Director (auto-filled) */}
          <div>
            <label className="block text-[12.5px] font-semibold text-text2 mb-1.5">
              ディレクター
            </label>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surf2 border border-wf-border text-[13px] text-text2">
              田中 太郎（自分）
            </div>
          </div>

          {/* Workload preview */}
          {workloadPreview && (
            <div
              className={`rounded-lg p-4 border ${getUtilBg(workloadPreview.projectedRate)} border-wf-border`}
            >
              <p className="text-[12px] font-semibold text-text2 mb-2">
                稼働率プレビュー
              </p>

              <div className="space-y-2">
                {/* Current */}
                <div className="flex items-center justify-between text-[12px]">
                  <span className="text-text3">現在の稼働率</span>
                  <span className={`font-bold ${getUtilColor(workloadPreview.currentRate)}`}>
                    {workloadPreview.currentRate}%
                  </span>
                </div>
                <ProgressBar
                  value={workloadPreview.currentRate}
                  height="sm"
                />

                {/* Arrow */}
                <div className="flex items-center justify-center text-text3 text-[12px]">
                  ↓ +{watchedHours && !isNaN(watchedHours) ? watchedHours : 0}h 追加
                </div>

                {/* Projected */}
                <div className="flex items-center justify-between text-[12px]">
                  <span className="text-text3">見込み稼働率</span>
                  <span
                    className={`font-bold ${getUtilColor(workloadPreview.projectedRate)}`}
                  >
                    {workloadPreview.projectedRate}%
                  </span>
                </div>
                <ProgressBar
                  value={Math.min(workloadPreview.projectedRate, 100)}
                  height="sm"
                />

                {/* Warning / danger */}
                {workloadPreview.projectedRate >= WORKLOAD_THRESHOLDS.danger && (
                  <p className="text-[11px] text-danger font-semibold mt-1">
                    ⚠ キャパシティを超過します（{workloadPreview.projectedHours}h / {workloadPreview.capacityHours}h）
                  </p>
                )}
                {workloadPreview.projectedRate >= WORKLOAD_THRESHOLDS.warning &&
                  workloadPreview.projectedRate < WORKLOAD_THRESHOLDS.danger && (
                    <p className="text-[11px] text-warn font-semibold mt-1">
                      ⚠ 稼働率が高くなっています（{workloadPreview.projectedHours}h / {workloadPreview.capacityHours}h）
                    </p>
                  )}
              </div>
            </div>
          )}

          {/* Confirmed deadline */}
          <div>
            <label
              htmlFor="confirmed_deadline"
              className="block text-[12.5px] font-semibold text-text2 mb-1.5"
            >
              確定納期 <span className="text-danger">*</span>
            </label>
            <input
              id="confirmed_deadline"
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
            {deadlineWarning && (
              <p className="mt-1 text-[11px] text-warn font-semibold">
                ⚠ 希望納期（{step1Data.desired_deadline}）より前の日付です
              </p>
            )}
          </div>

          {/* Estimated hours */}
          <div>
            <label
              htmlFor="estimated_hours"
              className="block text-[12.5px] font-semibold text-text2 mb-1.5"
            >
              見積時間（h） <span className="text-danger">*</span>
            </label>
            <Controller
              control={control}
              name="estimated_hours"
              render={({ field }) => (
                <input
                  id="estimated_hours"
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
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="
            px-5 py-2 rounded-lg text-[13px] font-semibold
            text-text2 bg-surf2 border border-wf-border
            hover:bg-wf-border transition-colors
          "
        >
          ← 前へ
        </button>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onSkip(step1Data)}
            className="
              px-5 py-2 rounded-lg text-[13px] font-semibold
              text-text2 bg-surf2 border border-wf-border
              hover:bg-wf-border transition-colors
            "
          >
            後で設定する
          </button>
          <button
            type="submit"
            className="
              px-5 py-2 rounded-lg text-[13px] font-semibold
              text-white bg-mint hover:bg-mint-d transition-colors
              disabled:opacity-50 disabled:cursor-not-allowed
            "
          >
            アサインしてクリエイターに通知 ✦
          </button>
        </div>
      </div>
    </form>
  )
}

// ---------------------------------------------------------------------------
// Summary row helper
// ---------------------------------------------------------------------------

function SummaryRow({
  label,
  value,
  isUrl,
}: {
  label: string
  value: string
  isUrl?: boolean
}) {
  return (
    <div className="flex gap-3">
      <span className="text-text3 shrink-0 w-[100px]">{label}</span>
      {isUrl ? (
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className="text-info underline break-all"
        >
          {value}
        </a>
      ) : (
        <span className="text-text1 break-all">{value}</span>
      )}
    </div>
  )
}
