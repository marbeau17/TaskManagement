// =============================================================================
// Data abstraction layer – Notifications
// =============================================================================

import type { Notification, NotificationType } from '@/types/database'
import { isMockMode } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Mock data store (for mock mode)
// ---------------------------------------------------------------------------

let mockNotifications: Notification[] = [
  {
    id: 'notif-1',
    user_id: 'u2',
    type: 'task_assigned',
    title: 'タスクがアサインされました',
    message: 'LP制作がアサインされました',
    link: '/tasks',
    is_read: false,
    created_at: new Date(Date.now() - 10 * 60_000).toISOString(),
  },
  {
    id: 'notif-2',
    user_id: 'u2',
    type: 'comment_added',
    title: 'コメントが追加されました',
    message: '山田太郎さんがコメントしました',
    link: '/tasks',
    is_read: false,
    created_at: new Date(Date.now() - 2 * 3600_000).toISOString(),
  },
  {
    id: 'notif-3',
    user_id: 'u2',
    type: 'task_status_changed',
    title: 'ステータスが変更されました',
    message: 'バナーデザインが完了になりました',
    link: '/tasks',
    is_read: true,
    created_at: new Date(Date.now() - 24 * 3600_000).toISOString(),
  },
]

// ---------------------------------------------------------------------------
// getNotifications
// ---------------------------------------------------------------------------

export async function getNotifications(
  userId: string,
  limit = 20
): Promise<Notification[]> {
  if (isMockMode()) {
    return mockNotifications
      .filter((n) => n.user_id === userId)
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      .slice(0, limit)
  }

  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.warn('[Notifications] Table may not exist:', error.message)
    return []
  }
  return (data ?? []) as Notification[]
}

// ---------------------------------------------------------------------------
// getUnreadCount
// ---------------------------------------------------------------------------

export async function getUnreadCount(userId: string): Promise<number> {
  if (isMockMode()) {
    return mockNotifications.filter(
      (n) => n.user_id === userId && !n.is_read
    ).length
  }

  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count, error } = await (supabase as any)
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false)

  if (error) {
    console.warn('[Notifications] getUnreadCount error:', error.message)
    return 0
  }
  return count ?? 0
}

// ---------------------------------------------------------------------------
// markAsRead
// ---------------------------------------------------------------------------

export async function markAsRead(notificationId: string): Promise<void> {
  if (isMockMode()) {
    mockNotifications = mockNotifications.map((n) =>
      n.id === notificationId ? { ...n, is_read: true } : n
    )
    return
  }

  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)

  if (error) console.warn('[Notifications] error:', error.message)
}

// ---------------------------------------------------------------------------
// markAllAsRead
// ---------------------------------------------------------------------------

export async function markAllAsRead(userId: string): Promise<void> {
  if (isMockMode()) {
    mockNotifications = mockNotifications.map((n) =>
      n.user_id === userId ? { ...n, is_read: true } : n
    )
    return
  }

  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false)

  if (error) console.warn('[Notifications] error:', error.message)
}

// ---------------------------------------------------------------------------
// createNotification — for internal use (triggers, server actions, etc.)
// ---------------------------------------------------------------------------

export interface CreateNotificationData {
  user_id: string
  type: NotificationType
  title: string
  message: string
  link?: string | null
}

export async function createNotification(
  data: CreateNotificationData
): Promise<Notification> {
  if (isMockMode()) {
    const newNotif: Notification = {
      id: `notif-${Date.now()}`,
      user_id: data.user_id,
      type: data.type,
      title: data.title,
      message: data.message,
      link: data.link ?? null,
      is_read: false,
      created_at: new Date().toISOString(),
    }
    mockNotifications = [newNotif, ...mockNotifications]
    return newNotif
  }

  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: result, error } = await (supabase as any)
    .from('notifications')
    .insert({
      user_id: data.user_id,
      type: data.type,
      title: data.title,
      message: data.message,
      link: data.link ?? null,
    })
    .select('*')
    .single()

  if (error) throw error
  return result as Notification
}
