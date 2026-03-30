'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getTimeLogs,
  addTimeLog,
  deleteTimeLog,
  getTimeLogSummary,
} from '@/lib/data/time-logs'
import type { AddTimeLogData } from '@/lib/data/time-logs'

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export function useTimeLogs(taskId: string) {
  return useQuery({
    queryKey: ['timeLogs', taskId],
    queryFn: () => getTimeLogs(taskId),
    enabled: !!taskId,
    retry: false,
  })
}

export function useTimeLogSummary(taskId: string) {
  return useQuery({
    queryKey: ['timeLogSummary', taskId],
    queryFn: () => getTimeLogSummary(taskId),
    enabled: !!taskId,
    retry: false,
  })
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export function useAddTimeLog() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: AddTimeLogData) => addTimeLog(data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['timeLogs', variables.task_id] })
      qc.invalidateQueries({ queryKey: ['timeLogSummary', variables.task_id] })
    },
  })
}

export function useDeleteTimeLog(taskId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteTimeLog(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['timeLogs', taskId] })
      qc.invalidateQueries({ queryKey: ['timeLogSummary', taskId] })
    },
  })
}
