'use client'

import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'

type PostgresChangeEvent = 'INSERT' | 'UPDATE' | 'DELETE'

interface RealtimeSubscriptionOptions {
  table: string
  events?: PostgresChangeEvent[]
  schema?: string
  filter?: string
  queryKeys: unknown[][]
  onchange?: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void
  enabled?: boolean
}

/**
 * Subscribes to Supabase Realtime postgres_changes and
 * auto-invalidates specified React Query cache keys.
 */
export function useRealtimeSubscription(options: RealtimeSubscriptionOptions) {
  const {
    table,
    events = ['INSERT', 'UPDATE', 'DELETE'],
    schema = 'public',
    filter,
    queryKeys,
    onchange,
    enabled = true,
  } = options

  const queryClient = useQueryClient()
  const onchangeRef = useRef(onchange)
  onchangeRef.current = onchange
  const queryKeysRef = useRef(queryKeys)
  queryKeysRef.current = queryKeys

  const subscriptionKey = JSON.stringify({ table, events, schema, filter, enabled })

  useEffect(() => {
    if (!enabled) return

    // Disable realtime until Supabase Realtime replication is configured
    // To enable: go to Supabase Dashboard → Database → Replication → enable tables
    return

    const supabase = createClient()
    const channelName = `realtime:${table}:${filter ?? 'all'}:${Date.now()}`
    let channel: RealtimeChannel = supabase.channel(channelName)

    for (const event of events) {
      const listenConfig: Record<string, unknown> = { event, schema, table }
      if (filter) listenConfig.filter = filter

      channel = channel.on(
        'postgres_changes' as 'system',
        listenConfig as never,
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          for (const key of queryKeysRef.current) {
            queryClient.invalidateQueries({ queryKey: key })
          }
          onchangeRef.current?.(payload)
        }
      )
    }

    channel.subscribe((status) => {
      if (status === 'CHANNEL_ERROR') {
        console.warn(`[Realtime] Channel error for ${table}, will retry`)
      }
    })

    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subscriptionKey])
}

/** Subscribe to realtime comment changes for a task */
export function useRealtimeComments(taskId: string | undefined) {
  useRealtimeSubscription({
    table: 'comments',
    events: ['INSERT', 'UPDATE', 'DELETE'],
    filter: taskId ? `task_id=eq.${taskId}` : undefined,
    queryKeys: taskId ? [['comments', taskId], ['activityLogs', taskId]] : [],
    enabled: !!taskId,
  })
}

/** Subscribe to realtime task status changes */
export function useRealtimeTaskStatus(taskId?: string) {
  const queryKeys: unknown[][] = [['tasks']]
  if (taskId) {
    queryKeys.push(['tasks', taskId])
    queryKeys.push(['activityLogs', taskId])
  }

  useRealtimeSubscription({
    table: 'tasks',
    events: ['UPDATE'],
    filter: taskId ? `id=eq.${taskId}` : undefined,
    queryKeys,
    enabled: true,
  })
}
