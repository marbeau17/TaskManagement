'use client'

import { useState } from 'react'
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
import { useChangePassword } from '@/hooks/useAuth'

// ---------------------------------------------------------------------------
// Zod schema
// ---------------------------------------------------------------------------

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, '現在のパスワードを入力してください'),
    newPassword: z
      .string()
      .min(8, 'パスワードは8文字以上で入力してください'),
    confirmPassword: z.string().min(1, '確認用パスワードを入力してください'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'パスワードが一致しません',
    path: ['confirmPassword'],
  })

type PasswordFormValues = z.infer<typeof passwordSchema>

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface PasswordChangeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PasswordChangeModal({
  open,
  onOpenChange,
}: PasswordChangeModalProps) {
  const { changePassword } = useChangePassword()
  const [serverError, setServerError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  })

  const onSubmit = async (data: PasswordFormValues) => {
    setServerError(null)
    setSuccess(false)

    try {
      const result = await changePassword(data.currentPassword, data.newPassword)

      if (result.success) {
        setSuccess(true)
        reset()
      } else {
        setServerError(
          result.error === 'Current password is incorrect'
            ? '現在のパスワードが正しくありません'
            : result.error ?? 'パスワード変更に失敗しました'
        )
      }
    } catch {
      setServerError('パスワード変更に失敗しました')
    }
  }

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) {
      reset()
      setServerError(null)
      setSuccess(false)
    }
    onOpenChange(nextOpen)
  }

  const labelClass = 'text-[11px] text-text2 font-medium block mb-[4px]'
  const inputClass =
    'w-full text-[13px] text-text px-[10px] py-[7px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint placeholder:text-text3'
  const errorClass = 'text-[10px] text-danger mt-[2px]'

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-surface border border-border2 sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="text-[15px] font-bold text-text">
            パスワード変更
          </DialogTitle>
          <DialogDescription className="text-[11px] text-text2">
            現在のパスワードと新しいパスワードを入力してください
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="py-[8px]">
            <div className="bg-ok-bg border border-ok-b rounded-[6px] px-[12px] py-[10px] text-[13px] text-ok text-center font-medium">
              パスワードが変更されました
            </div>
            <div className="flex justify-end mt-[16px]">
              <button
                type="button"
                onClick={() => handleClose(false)}
                className="px-[16px] py-[7px] text-[12px] text-white bg-mint rounded-[6px] hover:bg-mint-d transition-colors font-medium"
              >
                閉じる
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-[12px]">
            {/* Current password */}
            <div>
              <label className={labelClass}>現在のパスワード</label>
              <input
                type="password"
                placeholder="********"
                className={inputClass}
                {...register('currentPassword')}
              />
              {errors.currentPassword && (
                <p className={errorClass}>
                  {errors.currentPassword.message}
                </p>
              )}
            </div>

            {/* New password */}
            <div>
              <label className={labelClass}>新しいパスワード</label>
              <input
                type="password"
                placeholder="8文字以上"
                className={inputClass}
                {...register('newPassword')}
              />
              {errors.newPassword && (
                <p className={errorClass}>{errors.newPassword.message}</p>
              )}
            </div>

            {/* Confirm new password */}
            <div>
              <label className={labelClass}>新しいパスワード（確認）</label>
              <input
                type="password"
                placeholder="もう一度入力"
                className={inputClass}
                {...register('confirmPassword')}
              />
              {errors.confirmPassword && (
                <p className={errorClass}>
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            {/* Server error */}
            {serverError && (
              <div className="bg-danger-bg border border-danger-b rounded-[6px] px-[10px] py-[8px] text-[11px] text-danger">
                {serverError}
              </div>
            )}

            <DialogFooter>
              <button
                type="button"
                onClick={() => handleClose(false)}
                className="px-[16px] py-[7px] text-[12px] text-text2 bg-surf2 rounded-[6px] hover:bg-border2 transition-colors font-medium border border-border2"
              >
                キャンセル
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-[16px] py-[7px] text-[12px] text-white bg-mint rounded-[6px] hover:bg-mint-d transition-colors font-medium disabled:opacity-50"
              >
                {isSubmitting ? '変更中...' : '変更する'}
              </button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
