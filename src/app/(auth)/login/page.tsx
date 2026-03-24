'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { APP_NAME } from '@/lib/constants'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const { login } = useAuth()

  const isMockMode = process.env.NEXT_PUBLIC_USE_MOCK === 'true'

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setError('')
      setLoading(true)

      try {
        if (isMockMode) {
          // In mock mode, log in as the default director
          login()
          router.push('/dashboard')
        } else {
          // In production, use Supabase auth
          const { createClient } = await import('@/lib/supabase/client')
          const supabase = createClient()
          const { error: authError } =
            await supabase.auth.signInWithPassword({ email, password })
          if (authError) {
            setError(authError.message)
          } else {
            router.push('/dashboard')
          }
        }
      } catch {
        setError('ログインに失敗しました')
      } finally {
        setLoading(false)
      }
    },
    [email, password, isMockMode, login, router]
  )

  const handleDemoLogin = useCallback(() => {
    login()
    router.push('/dashboard')
  }, [login, router])

  return (
    <div className="min-h-screen bg-wf-bg flex items-center justify-center p-[20px]">
      <div className="bg-surface border border-border2 rounded-[12px] shadow-xl p-[40px] w-full max-w-[400px]">
        {/* Logo */}
        <div className="text-center mb-[32px]">
          <div className="inline-flex items-center justify-center w-[48px] h-[48px] bg-mint rounded-[10px] mb-[12px]">
            <span className="text-white font-bold text-[20px]">W</span>
          </div>
          <h1 className="text-[20px] font-bold text-text">{APP_NAME}</h1>
          <p className="text-[12px] text-text3 mt-[4px]">
            タスク管理システム
          </p>
        </div>

        {/* Login form */}
        <form onSubmit={handleSubmit} className="space-y-[16px]">
          <div>
            <label className="text-[11px] text-text2 font-medium block mb-[4px]">
              メールアドレス
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full text-[13px] text-text px-[12px] py-[9px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint placeholder:text-text3"
              required={!isMockMode}
            />
          </div>

          <div>
            <label className="text-[11px] text-text2 font-medium block mb-[4px]">
              パスワード
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="********"
              className="w-full text-[13px] text-text px-[12px] py-[9px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint placeholder:text-text3"
              required={!isMockMode}
            />
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

        {/* Demo mode button */}
        {isMockMode && (
          <div className="mt-[16px] pt-[16px] border-t border-border2">
            <button
              onClick={handleDemoLogin}
              className="w-full py-[10px] text-[13px] text-mint bg-surf2 rounded-[6px] hover:bg-border2 transition-colors font-medium border border-border2"
            >
              デモモードでログイン
            </button>
            <p className="text-[10px] text-text3 text-center mt-[8px]">
              田中太郎 (ディレクター) としてログインします
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
