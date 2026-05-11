'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { getSecurityPolicy, calcDaysRemaining } from '@/lib/data/security-policies'

/**
 * パスワード月次更新バナー / 強制モーダル。
 *
 * 表示ロジック:
 *   残日数 > warn_before_days: 何も表示しない
 *   0 < 残日数 <= warn_before_days: 黄色バナー (dismissable)
 *   残日数 === 0 (期限当日): 赤バナー (dismissable)
 *   残日数 < 0 (期限超過): 強制モーダル (graduated mode) / バナー (warn_only) / 即リダイレクト (strict)
 *
 * セッション中に dismiss された情報は sessionStorage で保持 (リロードで再表示)。
 */
export function PasswordExpiryBanner() {
  const { user } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [nowMs] = useState(() => Date.now())
  const [dismissed, setDismissed] = useState(false)

  const { data: policy } = useQuery({
    queryKey: ['security-policy'],
    queryFn: getSecurityPolicy,
    staleTime: 5 * 60 * 1000,
  })

  // セッション中の dismiss 状態
  useEffect(() => {
    if (typeof window === 'undefined' || !user) return
    setDismissed(sessionStorage.getItem(`pw-banner-dismissed-${user.id}`) === '1')
  }, [user])

  const daysRemaining = useMemo(() => {
    if (!user || !policy || !policy.enabled) return null
    return calcDaysRemaining(user.password_changed_at, policy.password_max_age_days, nowMs)
  }, [user, policy, nowMs])

  // 期限超過 + strict モードはプロファイルページ以外から自動リダイレクト
  useEffect(() => {
    if (!policy || !policy.enabled) return
    if (daysRemaining === null) return
    if (policy.enforcement_mode === 'strict' && daysRemaining < 0) {
      if (!pathname?.startsWith('/profile')) {
        router.replace('/profile?force=password')
      }
    }
  }, [policy, daysRemaining, pathname, router])

  if (!user || !policy || !policy.enabled || daysRemaining === null) return null
  if (daysRemaining > policy.warn_before_days) return null

  // 期限超過 + graduated mode → フルスクリーンモーダル (プロファイル画面以外)
  if (
    policy.enforcement_mode === 'graduated' &&
    daysRemaining < 0 &&
    !pathname?.startsWith('/profile')
  ) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="bg-surface border-2 border-red-500 rounded-[10px] p-[28px] max-w-[480px] mx-[16px] shadow-2xl">
          <div className="flex items-center gap-[10px] mb-[16px]">
            <span className="text-[26px]">🔒</span>
            <h2 className="text-[18px] font-bold text-red-500">パスワード更新が必要です</h2>
          </div>
          <p className="text-[13px] text-text mb-[6px]">
            最終変更から <strong>{Math.abs(daysRemaining)} 日</strong> 経過しています
            (運用ルール: {policy.password_max_age_days} 日ごと)。
          </p>
          <p className="text-[12px] text-text2 mb-[20px]">
            セキュリティ保護のため、続けるにはパスワードを更新してください。
          </p>
          <button
            onClick={() => router.push('/profile?force=password')}
            className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-[10px] rounded-[8px] transition"
          >
            今すぐ更新する
          </button>
        </div>
      </div>
    )
  }

  // dismissable バナー (黄 or 赤)
  if (dismissed) return null

  const isOverdue = daysRemaining <= 0
  const bgColor = isOverdue ? 'bg-red-500/10' : 'bg-amber-500/10'
  const borderColor = isOverdue ? 'border-red-500/40' : 'border-amber-500/40'
  const textColor = isOverdue ? 'text-red-500' : 'text-amber-600 dark:text-amber-400'
  const icon = isOverdue ? '⚠️' : '🔔'
  const label = isOverdue
    ? `本日がパスワード更新期限です (前回変更から ${policy.password_max_age_days} 日経過)`
    : `あと ${daysRemaining} 日でパスワード更新期限です`

  const handleDismiss = () => {
    if (typeof window !== 'undefined' && user) {
      sessionStorage.setItem(`pw-banner-dismissed-${user.id}`, '1')
    }
    setDismissed(true)
  }

  return (
    <div className={`${bgColor} ${borderColor} border-b px-[20px] py-[10px] flex items-center justify-between gap-[12px]`}>
      <div className="flex items-center gap-[10px] flex-1">
        <span className="text-[16px]">{icon}</span>
        <span className={`text-[13px] font-medium ${textColor}`}>{label}</span>
      </div>
      <div className="flex items-center gap-[8px]">
        <button
          onClick={() => router.push('/profile?force=password')}
          className={`text-[12px] font-bold px-[14px] py-[5px] rounded-[6px] ${isOverdue ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-amber-500 hover:bg-amber-600 text-white'} transition`}
        >
          パスワードを更新
        </button>
        <button
          onClick={handleDismiss}
          className="text-text3 hover:text-text text-[14px] px-[6px]"
          title="後で"
        >
          ×
        </button>
      </div>
    </div>
  )
}
