'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod/v4'
import { useAuth } from '@/hooks/useAuth'
import { APP_NAME } from '@/lib/constants'

// ---------------------------------------------------------------------------
// Zod schema
// ---------------------------------------------------------------------------

const loginSchema = z.object({
  email: z.string().min(1, 'メールアドレスは必須です').email('正しいメールアドレスを入力してください'),
  password: z.string().min(1, 'パスワードは必須です'),
})

type LoginFormValues = z.infer<typeof loginSchema>

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const { login } = useAuth()

  const isMockMode = process.env.NEXT_PUBLIC_USE_MOCK === 'true'

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  const onSubmit = useCallback(
    async (data: LoginFormValues) => {
      setError('')
      setLoading(true)

      try {
        const user = await login(data.email, data.password)
        if (user) {
          router.push('/dashboard')
        } else {
          setError('メールアドレスまたはパスワードが正しくありません')
        }
      } catch {
        setError('ログインに失敗しました')
      } finally {
        setLoading(false)
      }
    },
    [isMockMode, login, router]
  )

  const handleDemoLogin = useCallback(() => {
    setValue('email', 'o.yasuda@meetsc.co.jp')
    setValue('password', 'workflow2026')
  }, [setValue])

  return (
    <div className="min-h-screen bg-wf-bg flex items-center justify-center p-[20px]">
      <div className="bg-surface border border-border2 rounded-[12px] shadow-xl p-[40px] w-full max-w-[400px]">
        {/* Logo */}
        <div className="text-center mb-[32px]">
          <div className="inline-flex items-center justify-center w-[48px] h-[48px] bg-mint rounded-[10px] mb-[12px]">
            <span className="text-white font-bold text-[20px]">✦</span>
          </div>
          <h1 className="text-[20px] font-bold text-text">{APP_NAME}</h1>
          <p className="text-[12px] text-text3 mt-[4px]">
            タスク管理システム
          </p>
        </div>

        {/* Login form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-[16px]">
          <div>
            <label className="text-[11px] text-text2 font-medium block mb-[4px]">
              メールアドレス
            </label>
            <input
              type="email"
              {...register('email')}
              placeholder="you@example.com"
              className="w-full text-[13px] text-text px-[12px] py-[9px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint placeholder:text-text3"
              required
            />
            {errors.email && (
              <p className="text-[11px] text-danger mt-[2px]">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label className="text-[11px] text-text2 font-medium block mb-[4px]">
              パスワード
            </label>
            <input
              type="password"
              {...register('password')}
              placeholder="********"
              className="w-full text-[13px] text-text px-[12px] py-[9px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint placeholder:text-text3"
              required
            />
            {errors.password && (
              <p className="text-[11px] text-danger mt-[2px]">{errors.password.message}</p>
            )}
          </div>

          {error && (
            <div className="text-[12px] text-danger bg-danger-bg border border-danger-b rounded-[6px] px-[10px] py-[6px]">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-[10px] text-[13px] text-white bg-mint rounded-[6px] hover:bg-mint-d transition-colors font-medium disabled:opacity-50"
          >
            {loading ? 'ログイン中...' : 'ログイン'}
          </button>
        </form>

        {/* Hint text */}
        <p className="text-[10px] text-text3 text-center mt-[12px]">
          初期パスワード: workflow2026
        </p>

        {/* Demo mode button */}
        {isMockMode && (
          <div className="mt-[16px] pt-[16px] border-t border-border2">
            <button
              type="button"
              onClick={handleDemoLogin}
              className="w-full py-[10px] text-[13px] text-mint bg-surf2 rounded-[6px] hover:bg-border2 transition-colors font-medium border border-border2"
            >
              デモモードでログイン
            </button>
            <p className="text-[10px] text-text3 text-center mt-[8px]">
              o.yasuda@meetsc.co.jp / workflow2026 を自動入力します
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
