'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getWatchers,
  addWatcher,
  removeWatcher,
  isWatching,
} from '@/lib/data/watchers'

// ---------------------------------------------------------------------------
// Query: fetch all watchers for a task
// ---------------------------------------------------------------------------

export function useWatchers(taskId: string) {
  return useQuery({
    queryKey: ['watchers', taskId],
    queryFn: () => getWatchers(taskId),
    enabled: !!taskId,
  })
}

// ---------------------------------------------------------------------------
// Query: check if current user is watching
// ---------------------------------------------------------------------------

export function useIsWatching(taskId: string, userId: string | undefined) {
  return useQuery({
    queryKey: ['watching', taskId, userId],
    queryFn: () => isWatching(taskId, userId!),
    enabled: !!taskId && !!userId,
  })
}

// ---------------------------------------------------------------------------
// Mutation: add a watcher (follow)
// ---------------------------------------------------------------------------

export function useAddWatcher() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ taskId, userId }: { taskId: string; userId: string }) =>
      addWatcher(taskId, userId),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['watchers', variables.taskId] })
      qc.invalidateQueries({
        queryKey: ['watching', variables.taskId, variables.userId],
      })
    },
  })
}

// ---------------------------------------------------------------------------
// Mutation: remove a watcher (unfollow)
// ---------------------------------------------------------------------------

export function useRemoveWatcher() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ taskId, userId }: { taskId: string; userId: string }) =>
      removeWatcher(taskId, userId),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['watchers', variables.taskId] })
      qc.invalidateQueries({
        queryKey: ['watching', variables.taskId, variables.userId],
      })
    },
  })
}
