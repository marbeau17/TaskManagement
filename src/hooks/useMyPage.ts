'use client'

import { useQuery } from '@tanstack/react-query'
import { useAuth } from './useAuth'
import { APP_CONFIG } from '@/lib/config'
import type { MyPageData } from '@/types/mypage'

export function useMyPage() {
  const { user } = useAuth()

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
