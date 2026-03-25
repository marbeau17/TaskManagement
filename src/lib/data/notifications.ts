// =============================================================================
// Data abstraction layer – Notifications
// Fetches recent activity_logs across all tasks for the notification bell
// =============================================================================

import type { ActivityLog } from '@/types/database'
import { useMock } from '@/lib/utils'

// ---------------------------------------------------------------------------
// getRecentNotifications — fetch the latest activity_logs (limit 10)
// ---------------------------------------------------------------------------

export async function getRecentNotifications(): Promise<ActivityLog[]> {
  if (useMock()) {
    const { getMockRecentNotifications } = await import('@/lib/mock/handlers')
    return getMockRecentNotifications()
  }

  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()

  const { data, error } = await supabase
    .from('activity_logs')
    .select('*, user:users!activity_logs_user_id_fkey(*)')
    .order('created_at', { ascending: false })
    .limit(10)

  if (error) throw error
  return (data ?? []) as ActivityLog[]
}
