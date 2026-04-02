'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useAuth } from './useAuth'
import { APP_CONFIG } from '@/lib/config'
import type { MyPageData } from '@/types/mypage'

export function useMyPage() {
  const { user } = useAuth()
  const qc = useQueryClient()

  // Invalidate mypage when tasks or issues are mutated
  useEffect(() => {
    const unsubscribe = qc.getQueryCache().subscribe((event) => {
      if (event.type === 'updated' && event.action.type === 'success') {
        const key = event.query.queryKey
        if (
          (Array.isArray(key) && (key[0] === 'tasks' || key[0] === 'issues')) &&
          event.query.state.dataUpdateCount > 1
        ) {
          qc.invalidateQueries({ queryKey: ['mypage'] })
        }
      }
    })
    return unsubscribe
  }, [qc])

  return useQuery<MyPageData>({
    queryKey: ['mypage', user?.id],
    queryFn: async () => {
      const res = await fetch('/api/mypage')
      if (!res.ok) throw new Error('Failed to fetch mypage data')
      return res.json()
    },
    enabled: !!user,
    staleTime: APP_CONFIG.cache.queryStaleTimeMs,
    refetchInterval: 5 * 60 * 1000,
  })
}
