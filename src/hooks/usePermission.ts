'use client'

import { useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { getPermissions } from '@/lib/data/permissions'
import type { Permission } from '@/lib/data/permissions'

// access_domains に並ぶ値 = リソース名 (tasks / issues / projects / workload /
// chat / reports / pipeline / crm)。カスタムロール (例: Specialist) が permissions
// テーブル未登録の場合のセーフティネットとして、access_domains に該当リソースが
// 含まれていれば read を許可する。create/update/delete は明示的な permissions が
// 必要 — 書き換え系をアクセスドメインだけで開放するのは権限管理上危険なため。
const SAFE_FALLBACK_ACTIONS = new Set(['read'])

// 誰でも起票可能にしたいリソース・アクションの組み合わせ。
// 課題 (issues) は社内全員が品質報告できるように、ロール / access_domains を
// 問わずログイン済みユーザー全員に create を開放する (運用方針による特例)。
const OPEN_TO_ALL_AUTHENTICATED = new Set<string>(['issues:create'])

export function usePermission() {
  const { user } = useAuth()

  const { data: permissions } = useQuery<Permission[]>({
    queryKey: ['permissions'],
    queryFn: getPermissions,
    staleTime: 5 * 60 * 1000, // cache for 5 minutes
  })

  const can = useCallback(
    (resource: string, action: string): boolean => {
      if (!user) return false

      // 誰でも起票可ポリシー: ログイン済みであれば常に許可。
      // 個別のロール / access_domains を問わない。
      if (OPEN_TO_ALL_AUTHENTICATED.has(`${resource}:${action}`)) return true

      const allowedByRole =
        permissions?.some(
          (p) =>
            p.role === user.role &&
            p.allowed &&
            (p.resource === '*' || p.resource === resource) &&
            (p.action === '*' || p.action === action),
        ) ?? false
      if (allowedByRole) return true

      // ロール一致が無くても、ユーザー個別の access_domains に当該リソースが
      // 含まれていれば read だけは許可する。create/update/delete はロール権限が
      // 必要なため、未登録ロールでは「画面は見えるが書き換え不可」になる。
      // → 管理者は permissions テーブルにロール登録を行うべきというシグナル。
      if (
        SAFE_FALLBACK_ACTIONS.has(action) &&
        Array.isArray(user.access_domains) &&
        user.access_domains.includes(resource)
      ) {
        return true
      }

      return false
    },
    [user, permissions],
  )

  return { can }
}
