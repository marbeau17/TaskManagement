'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} from '@/lib/data/notifications'
import { useAuthStore } from '@/stores/authStore'
import { useMock } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Default user id for mock mode
// ---------------------------------------------------------------------------

const MOCK_USER_ID = 'u2'

function useUserId(): string | undefined {
  const { user } = useAuthStore()
  if (useMock()) return user?.id ?? MOCK_USER_ID
  return user?.id
}

// ---------------------------------------------------------------------------
// useNotifications — fetch notification list
// ---------------------------------------------------------------------------

export function useNotifications(limit = 20) {
  const userId = useUserId()

  const query = useQuery({
    queryKey: ['notifications', userId, limit],
    queryFn: () => getNotifications(userId!, limit),
    enabled: !!userId,
    refetchInterval: 60_000,
    retry: false,
  })

  return {
    ...query,
    notifications: query.data ?? [],
  }
}

// ---------------------------------------------------------------------------
// useUnreadCount — fetch unread notification count
// ---------------------------------------------------------------------------

export function useUnreadCount() {
  const userId = useUserId()

  const query = useQuery({
    queryKey: ['notifications-unread-count', userId],
    queryFn: () => getUnreadCount(userId!),
    enabled: !!userId,
    refetchInterval: 60_000,
    retry: false,
  })

  return {
    ...query,
    unreadCount: query.data ?? 0,
  }
}

// ---------------------------------------------------------------------------
// useMarkAsRead — mark a single notification as read
// ---------------------------------------------------------------------------

export function useMarkAsRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (notificationId: string) => markAsRead(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] })
    },
  })
}

// ---------------------------------------------------------------------------
// useMarkAllAsRead — mark all notifications as read
// ---------------------------------------------------------------------------

export function useMarkAllAsRead() {
  const userId = useUserId()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => {
      if (!userId) throw new Error('Not authenticated')
      return markAllAsRead(userId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] })
    },
  })
}
