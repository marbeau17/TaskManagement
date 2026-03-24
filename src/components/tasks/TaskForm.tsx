'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod/v4'
import type { TaskFormStep1 } from '@/types/task'

// ---------------------------------------------------------------------------
// Zod schema for Step 1
// ---------------------------------------------------------------------------

const step1Schema = z.object({
  client_name: z.string().min(1, 'クライアント名は必須です'),
  title: z.string().min(1, 'タスク名は必須です'),
  description: z.string().optional(),
  desired_deadline: z.string().optional(),
  reference_url: z.string().optional(),
})

type Step1FormValues = z.infer<typeof step1Schema>

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface TaskFormProps {
  defaultValues?: Partial<TaskFormStep1>
  onSubmit: (data: TaskFormStep1) => void
  onCancel: () => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TaskForm({ defaultValues, onSubmit, onCancel }: TaskFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<Step1FormValues>({
    resolver: zodResolver(step1Schema),
    defaultValues: {
      client_name: defaultValues?.client_name ?? '',
      title: defaultValues?.title ?? '',
      description: defaultValues?.description ?? '',
      desired_deadline: defaultValues?.desired_deadline ?? '',
      reference_url: defaultValues?.reference_url ?? '',
    },
    mode: 'onTouched',
  })

  const submit = (values: Step1FormValues) => {
    const data: TaskFormStep1 = {
      client_name: values.client_name,
      title: values.title,
      description: values.description || undefined,
      desired_deadline: values.desired_deadline || undefined,
      reference_url: values.reference_url || undefined,
    }
    onSubmit(data)
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-6">
      {/* Card */}
      <div className="bg-surface rounded-xl border border-wf-border shadow-sm">
        {/* Card header */}
        <div className="px-6 py-4 border-b border-wf-border">
          <h2 className="text-[15px] font-bold text-text1">
            📋 依頼基本情報
          </h2>
        </div>

        {/* Card body */}
        <div className="px-6 py-5 space-y-5">
          {/* Client name */}
          <div>
            <label
              htmlFor="client_name"
              className="block text-[12.5px] font-semibold text-text2 mb-1.5"
            >
              クライアント名 <span className="text-danger">*</span>
            </label>
            <input
              id="client_name"
              type="text"
              autoComplete="organization"
              placeholder="例: 株式会社サンプル"
              className={`
                w-full rounded-lg border px-3 py-2 text-[13px] text-text1
                bg-surface placeholder:text-text3
                focus:outline-none focus:ring-2 focus:ring-mint/40 focus:border-mint
                ${errors.client_name ? 'border-danger' : 'border-wf-border'}
              `}
              {...register('client_name')}
            />
            {errors.client_name && (
              <p className="mt-1 text-[11px] text-danger">
                {errors.client_name.message}
              </p>
            )}
          </div>

          {/* Task name */}
          <div>
            <label
              htmlFor="title"
              className="block text-[12.5px] font-semibold text-text2 mb-1.5"
            >
              タスク名 <span className="text-danger">*</span>
            </label>
            <input
              id="title"
              type="text"
              placeholder="例: LP制作・バナーデザイン"
              className={`
                w-full rounded-lg border px-3 py-2 text-[13px] text-text1
                bg-surface placeholder:text-text3
                focus:outline-none focus:ring-2 focus:ring-mint/40 focus:border-mint
                ${errors.title ? 'border-danger' : 'border-wf-border'}
              `}
              {...register('title')}
            />
            {errors.title && (
              <p className="mt-1 text-[11px] text-danger">
                {errors.title.message}
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="description"
              className="block text-[12.5px] font-semibold text-text2 mb-1.5"
            >
              説明
            </label>
            <textarea
              id="description"
              rows={4}
              placeholder="タスクの詳細や要件を入力してください"
              className="
                w-full rounded-lg border border-wf-border px-3 py-2 text-[13px] text-text1
                bg-surface placeholder:text-text3 resize-y
                focus:outline-none focus:ring-2 focus:ring-mint/40 focus:border-mint
              "
              {...register('description')}
            />
          </div>

          {/* Desired deadline */}
          <div>
            <label
              htmlFor="desired_deadline"
              className="block text-[12.5px] font-semibold text-text2 mb-1.5"
            >
              希望納期
            </label>
            <input
              id="desired_deadline"
              type="date"
              className="
                w-full rounded-lg border border-wf-border px-3 py-2 text-[13px] text-text1
                bg-surface
                focus:outline-none focus:ring-2 focus:ring-mint/40 focus:border-mint
              "
              {...register('desired_deadline')}
            />
          </div>

          {/* Reference URL */}
          <div>
            <label
              htmlFor="reference_url"
              className="block text-[12.5px] font-semibold text-text2 mb-1.5"
            >
              参考URL
            </label>
            <input
              id="reference_url"
              type="text"
              placeholder="https://..."
              className="
                w-full rounded-lg border border-wf-border px-3 py-2 text-[13px] text-text1
                bg-surface placeholder:text-text3
                focus:outline-none focus:ring-2 focus:ring-mint/40 focus:border-mint
              "
              {...register('reference_url')}
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="
            px-5 py-2 rounded-lg text-[13px] font-semibold
            text-text2 bg-surf2 border border-wf-border
            hover:bg-wf-border transition-colors
          "
        >
          キャンセル
        </button>
        <button
          type="submit"
          className="
            px-5 py-2 rounded-lg text-[13px] font-semibold
            text-white bg-mint hover:bg-mint-d transition-colors
            disabled:opacity-50 disabled:cursor-not-allowed
          "
        >
          依頼を登録してアサインを依頼 →
        </button>
      </div>
    </form>
  )
}
