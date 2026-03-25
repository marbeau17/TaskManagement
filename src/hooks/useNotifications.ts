'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getRecentNotifications } from '@/lib/data/notifications'

// ---------------------------------------------------------------------------
// useNotifications — fetches recent activity_logs for the notification bell
// ---------------------------------------------------------------------------

export function useNotifications() {
  const { data: notifications, ...rest } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => getRecentNotifications(),
    refetchInterval: 30_000, // poll every 30s
  })

  const unreadCount = useMemo(() => {
    if (!notifications) return 0
    // Consider items from the last 24 hours as "unread"
    const cutoff = Date.now() - 24 * 60 * 60 * 1000
    return notifications.filter(
      (n) => new Date(n.created_at).getTime() > cutoff
    ).length
  }, [notifications])

  return {
    ...rest,
    notifications: notifications ?? [],
    unreadCount,
  }
}
