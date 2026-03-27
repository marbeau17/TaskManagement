'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuthStore } from '@/stores/authStore'
import { useI18n } from '@/hooks/useI18n'
import { forceChangePassword } from '@/lib/data/members'

// ---------------------------------------------------------------------------
// Zod schema – uses i18n keys as messages, translated at render time
// ---------------------------------------------------------------------------

const changePasswordSchema = z
  .object({
    newPassword: z.string().min(8, 'auth.passwordMinLength'),
    confirmPassword: z.string().min(1, 'auth.confirmPasswordRequired'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'auth.passwordMismatch',
    path: ['confirmPassword'],
  })

type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ChangePasswordPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  const { user, setUser } = useAuthStore()
  const { t } = useI18n()

  // Redirect if no user or password change not required
  useEffect(() => {
    if (!user) {
      router.push('/login')
    } else if (!user.must_change_password) {
      router.push('/dashboard')
    }
  }, [user, router])

  // Redirect to dashboard after success
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        router.push('/dashboard')
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [success, router])

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  })

  const onSubmit = useCallback(
    async (data: ChangePasswordFormValues) => {
      if (!user) return
      setError('')
      setLoading(true)

      try {
        const result = await forceChangePassword(user.id, data.newPassword)
        if (result.success) {
          setUser({ ...user, must_change_password: false })
          setSuccess(true)
        } else {
          setError(result.error ?? 'auth.passwordChangeFailed')
        }
      } catch {
        setError('auth.passwordChangeFailed')
      } finally {
        setLoading(false)
      }
    },
    [user, setUser]
  )

  // Don't render form if redirecting
  if (!user || !user.must_change_password) {
    return null
  }

  return (
    <div className="min-h-screen bg-wf-bg flex items-center justify-center p-[20px]">
      <div className="bg-surface border border-border2 rounded-[12px] shadow-xl p-[40px] w-full max-w-[400px]">
        {/* Logo */}
        <div className="text-center mb-[32px]">
          <div className="inline-flex items-center justify-center w-[48px] h-[48px] bg-mint rounded-[10px] mb-[12px]">
            <span className="text-white font-bold text-[20px]">✦</span>
          </div>
          <h1 className="text-[20px] font-bold text-text">
            {t('auth.changePasswordRequired')}
          </h1>
          <p className="text-[12px] text-text3 mt-[4px]">
            {t('auth.changePasswordDescription')}
          </p>
        </div>

        {success ? (
          <div className="bg-ok-bg border border-ok rounded-[6px] px-[10px] py-[8px] text-[12px] text-ok text-center">
            {t('auth.passwordChanged')}
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-[16px]">
            <div>
              <label className="text-[11px] text-text2 font-medium block mb-[4px]">
                {t('auth.newPassword')}
              </label>
              <input
                type="password"
                {...register('newPassword')}
                placeholder={t('auth.newPasswordPlaceholder')}
                className="w-full text-[13px] text-text px-[12px] py-[9px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint placeholder:text-text3"
              />
              {errors.newPassword && (
                <p className="text-[11px] text-danger mt-[2px]">
                  {t(errors.newPassword.message ?? '')}
                </p>
              )}
            </div>

            <div>
              <label className="text-[11px] text-text2 font-medium block mb-[4px]">
                {t('auth.confirmPassword')}
              </label>
              <input
                type="password"
                {...register('confirmPassword')}
                placeholder={t('auth.confirmPasswordPlaceholder')}
                className="w-full text-[13px] text-text px-[12px] py-[9px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint placeholder:text-text3"
              />
              {errors.confirmPassword && (
                <p className="text-[11px] text-danger mt-[2px]">
                  {t(errors.confirmPassword.message ?? '')}
                </p>
              )}
            </div>

            {error && (
              <div className="text-[12px] text-danger bg-danger-bg border border-danger-b rounded-[6px] px-[10px] py-[6px]">
                {t(error)}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-[10px] text-[13px] text-white bg-mint rounded-[6px] hover:bg-mint-d transition-colors font-medium disabled:opacity-50"
            >
              {loading ? t('auth.changing') : t('auth.changePasswordButton')}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
