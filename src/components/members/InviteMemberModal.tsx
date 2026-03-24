'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { useAddMember } from '@/hooks/useMembers'
import { ROLE_LABELS } from '@/lib/constants'
import type { UserRole } from '@/types/database'

// ---------------------------------------------------------------------------
// Zod schema
// ---------------------------------------------------------------------------

const inviteSchema = z.object({
  email: z.email('有効なメールアドレスを入力してください'),
  name: z.string().min(1, '名前は必須です'),
  name_short: z
    .string()
    .min(1, '略称は必須です')
    .max(1, '略称は1文字で入力してください'),
  role: z.enum(['admin', 'director', 'requester', 'creator']),
  weekly_capacity_hours: z.number().min(0).max(80),
})

type InviteFormValues = z.infer<typeof inviteSchema>

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface InviteMemberModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function InviteMemberModal({
  open,
  onOpenChange,
  onSuccess,
}: InviteMemberModalProps) {
  const addMember = useAddMember()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<InviteFormValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      email: '',
      name: '',
      name_short: '',
      role: 'creator',
      weekly_capacity_hours: 16.0,
    },
  })

  const onSubmit = async (data: InviteFormValues) => {
    try {
      await addMember.mutateAsync(data)
      reset()
      onOpenChange(false)
      onSuccess?.()
    } catch {
      // Error is handled by mutation state
    }
  }

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) {
      reset()
      addMember.reset()
    }
    onOpenChange(nextOpen)
  }

  const labelClass = 'text-[11px] text-text2 font-medium block mb-[4px]'
  const inputClass =
    'w-full text-[13px] text-text px-[10px] py-[7px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint'
  const errorClass = 'text-[10px] text-danger mt-[2px]'

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-surface border border-border2 sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="text-[15px] font-bold text-text">
            メンバー招待
          </DialogTitle>
          <DialogDescription className="text-[11px] text-text2">
            新しいメンバーをワークスペースに招待します
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-[12px]">
          {/* メールアドレス */}
          <div>
            <label className={labelClass}>メールアドレス</label>
            <input
              type="email"
              placeholder="user@example.com"
              className={inputClass}
              {...register('email')}
            />
            {errors.email && (
              <p className={errorClass}>{errors.email.message}</p>
            )}
          </div>

          {/* 名前 */}
          <div>
            <label className={labelClass}>名前</label>
            <input
              type="text"
              placeholder="山田 花子"
              className={inputClass}
              {...register('name')}
            />
            {errors.name && (
              <p className={errorClass}>{errors.name.message}</p>
            )}
          </div>

          {/* 略称 */}
          <div>
            <label className={labelClass}>略称</label>
            <input
              type="text"
              placeholder="山"
              maxLength={1}
              className={inputClass}
              {...register('name_short')}
            />
            {errors.name_short && (
              <p className={errorClass}>{errors.name_short.message}</p>
            )}
          </div>

          {/* ロール */}
          <div>
            <label className={labelClass}>ロール</label>
            <select className={inputClass} {...register('role')}>
              {(Object.entries(ROLE_LABELS) as [UserRole, string][]).map(
                ([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                )
              )}
            </select>
            {errors.role && (
              <p className={errorClass}>{errors.role.message}</p>
            )}
          </div>

          {/* 週キャパシティ */}
          <div>
            <label className={labelClass}>週キャパシティ (h)</label>
            <input
              type="number"
              min={0}
              max={80}
              step={0.5}
              className={inputClass}
              {...register('weekly_capacity_hours', { valueAsNumber: true })}
            />
            {errors.weekly_capacity_hours && (
              <p className={errorClass}>
                {errors.weekly_capacity_hours.message}
              </p>
            )}
          </div>

          {/* Notice */}
          <div className="bg-info-bg border border-info-b rounded-[6px] px-[10px] py-[8px] text-[11px] text-info leading-relaxed">
            初期パスワード「workflow2026」が設定されます。初回ログイン時にパスワード変更が必要です。
          </div>

          {/* Mutation error */}
          {addMember.isError && (
            <div className="bg-danger-bg border border-danger-b rounded-[6px] px-[10px] py-[8px] text-[11px] text-danger">
              招待に失敗しました。もう一度お試しください。
            </div>
          )}

          <DialogFooter>
            <button
              type="button"
              onClick={() => handleClose(false)}
              className="px-[16px] py-[7px] text-[12px] text-text2 bg-surf2 rounded-[6px] hover:bg-border2 transition-colors"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isSubmitting || addMember.isPending}
              className="px-[16px] py-[7px] text-[12px] text-white bg-mint rounded-[6px] hover:bg-mint-d transition-colors disabled:opacity-50"
            >
              {addMember.isPending ? '招待中...' : '招待する'}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
