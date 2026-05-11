'use client'

import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { getSecurityPolicy, updateSecurityPolicy } from '@/lib/data/security-policies'
import type { SecurityPolicy } from '@/lib/data/security-policies'
import { toast } from '@/stores/toastStore'

interface StaleUser {
  id: string
  name: string
  email: string
  password_changed_at: string | null
  daysOverdue: number
}

/**
 * セキュリティマスター画面: パスワード月次更新ポリシーを管理し、
 * 期限切れユーザーの一覧表示と個別リマインドを行う。admin 専用。
 */
export function SecurityPolicySettings() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const { data: policy } = useQuery({
    queryKey: ['security-policy'],
    queryFn: getSecurityPolicy,
  })

  const [draft, setDraft] = useState<SecurityPolicy | null>(null)
  useEffect(() => {
    if (policy) setDraft(policy)
  }, [policy])

  const [staleUsers, setStaleUsers] = useState<StaleUser[]>([])
  const [loadingStale, setLoadingStale] = useState(false)

  // 期限切れに近いユーザーを取得
  const refreshStaleUsers = async () => {
    if (!policy) return
    setLoadingStale(true)
    try {
      const res = await fetch('/api/security-policies/stale-users')
      if (res.ok) {
        const data = await res.json()
        setStaleUsers(data.users ?? [])
      }
    } catch (e) {
      console.error('failed to load stale users:', e)
    } finally {
      setLoadingStale(false)
    }
  }

  useEffect(() => {
    refreshStaleUsers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [policy?.password_max_age_days])

  if (!user) return null
  if (user.role !== 'admin') {
    return (
      <div className="bg-surface border border-border2 rounded-[10px] p-[20px]">
        <p className="text-[13px] text-text2">この設定は管理者のみが変更できます。</p>
      </div>
    )
  }
  if (!draft) return null

  const handleSave = async () => {
    const res = await updateSecurityPolicy(
      {
        password_max_age_days: draft.password_max_age_days,
        warn_before_days: draft.warn_before_days,
        enforcement_mode: draft.enforcement_mode,
        reminder_email_enabled: draft.reminder_email_enabled,
        enabled: draft.enabled,
      },
      user.id,
    )
    if (res.success) {
      toast.success('セキュリティポリシーを更新しました')
      qc.invalidateQueries({ queryKey: ['security-policy'] })
    } else {
      toast.error(`保存失敗: ${res.error}`)
    }
  }

  const handleRemindOne = async (userId: string) => {
    const res = await fetch('/api/security-policies/remind', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    })
    if (res.ok) {
      toast.success('リマインドメールを送信しました')
    } else {
      const err = await res.json().catch(() => ({}))
      toast.error(`送信失敗: ${err.error ?? res.status}`)
    }
  }

  return (
    <div className="space-y-[20px]">
      <div className="bg-surface border border-border2 rounded-[10px] p-[20px]">
        <h3 className="text-[14px] font-bold text-text mb-[14px]">🔐 パスワード月次更新ポリシー</h3>

        <div className="space-y-[14px]">
          <label className="flex items-center gap-[10px]">
            <input
              type="checkbox"
              checked={draft.enabled}
              onChange={(e) => setDraft({ ...draft, enabled: e.target.checked })}
            />
            <span className="text-[13px] text-text">ポリシーを有効化</span>
          </label>

          <div>
            <label className="text-[12px] text-text2 block mb-[4px]">更新サイクル (日)</label>
            <input
              type="number"
              min={1}
              max={365}
              value={draft.password_max_age_days}
              onChange={(e) => setDraft({ ...draft, password_max_age_days: Number(e.target.value) })}
              className="w-[120px] px-[10px] py-[6px] bg-surface2 border border-border2 rounded-[6px] text-[13px] text-text"
            />
            <span className="text-[11px] text-text3 ml-[8px]">推奨: 30 日</span>
          </div>

          <div>
            <label className="text-[12px] text-text2 block mb-[4px]">期限の何日前から警告</label>
            <input
              type="number"
              min={0}
              max={90}
              value={draft.warn_before_days}
              onChange={(e) => setDraft({ ...draft, warn_before_days: Number(e.target.value) })}
              className="w-[120px] px-[10px] py-[6px] bg-surface2 border border-border2 rounded-[6px] text-[13px] text-text"
            />
            <span className="text-[11px] text-text3 ml-[8px]">推奨: 7 日</span>
          </div>

          <div>
            <label className="text-[12px] text-text2 block mb-[4px]">期限超過時の挙動</label>
            <select
              value={draft.enforcement_mode}
              onChange={(e) =>
                setDraft({ ...draft, enforcement_mode: e.target.value as SecurityPolicy['enforcement_mode'] })
              }
              className="px-[10px] py-[6px] bg-surface2 border border-border2 rounded-[6px] text-[13px] text-text"
            >
              <option value="graduated">段階的圧力 (推奨): 警告 → モーダル</option>
              <option value="warn_only">警告のみ (バナー)</option>
              <option value="strict">厳格: 期限当日から即リダイレクト</option>
            </select>
          </div>

          <label className="flex items-center gap-[10px]">
            <input
              type="checkbox"
              checked={draft.reminder_email_enabled}
              onChange={(e) => setDraft({ ...draft, reminder_email_enabled: e.target.checked })}
            />
            <span className="text-[13px] text-text">リマインドメールを自動送信 (7 日前 / 当日)</span>
          </label>
        </div>

        <div className="mt-[20px] flex justify-end">
          <button
            onClick={handleSave}
            className="bg-mint hover:bg-mint-dark text-white font-bold px-[18px] py-[8px] rounded-[8px] transition"
          >
            保存
          </button>
        </div>
      </div>

      <div className="bg-surface border border-border2 rounded-[10px] p-[20px]">
        <div className="flex items-center justify-between mb-[14px]">
          <h3 className="text-[14px] font-bold text-text">⚠️ 期限が近い / 超過しているユーザー</h3>
          <button
            onClick={refreshStaleUsers}
            className="text-[11px] text-text2 hover:text-text underline"
          >
            再取得
          </button>
        </div>
        {loadingStale ? (
          <p className="text-[12px] text-text3">読み込み中...</p>
        ) : staleUsers.length === 0 ? (
          <p className="text-[12px] text-text3">該当ユーザーはいません 🎉</p>
        ) : (
          <table className="w-full text-[12px]">
            <thead>
              <tr className="text-left text-text3 border-b border-border2">
                <th className="py-[6px]">名前</th>
                <th>メール</th>
                <th>最終変更</th>
                <th>状態</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {staleUsers.map((u) => {
                const isOverdue = u.daysOverdue >= 0
                return (
                  <tr key={u.id} className="border-b border-border2/50">
                    <td className="py-[6px] text-text">{u.name}</td>
                    <td className="text-text2">{u.email}</td>
                    <td className="text-text2">
                      {u.password_changed_at
                        ? new Date(u.password_changed_at).toLocaleDateString('ja-JP')
                        : '未記録'}
                    </td>
                    <td className={isOverdue ? 'text-red-500 font-bold' : 'text-amber-500'}>
                      {isOverdue ? `${u.daysOverdue} 日超過` : `あと ${-u.daysOverdue} 日`}
                    </td>
                    <td>
                      <button
                        onClick={() => handleRemindOne(u.id)}
                        className="text-[11px] bg-mint/20 hover:bg-mint/30 text-mint-dark px-[10px] py-[3px] rounded-[5px]"
                      >
                        リマインド
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
