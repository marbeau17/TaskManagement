'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getTaskAssignees,
  addTaskAssignee,
  removeTaskAssignee,
} from '@/lib/data/task-assignees'

// ---------------------------------------------------------------------------
// Query: fetch all assignees for a task
// ---------------------------------------------------------------------------

export function useTaskAssignees(taskId: string) {
  return useQuery({
    queryKey: ['taskAssignees', taskId],
    queryFn: () => getTaskAssignees(taskId),
    enabled: !!taskId,
  })
}

// ---------------------------------------------------------------------------
// Mutation: add an assignee
// ---------------------------------------------------------------------------

export function useAddTaskAssignee() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ taskId, userId }: { taskId: string; userId: string }) =>
      addTaskAssignee(taskId, userId),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['taskAssignees', variables.taskId] })
      qc.invalidateQueries({ queryKey: ['tasks'] })
      qc.invalidateQueries({ queryKey: ['tasks', variables.taskId] })
    },
  })
}

// ---------------------------------------------------------------------------
// Mutation: remove an assignee
// ---------------------------------------------------------------------------

export function useRemoveTaskAssignee() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ taskId, userId }: { taskId: string; userId: string }) =>
      removeTaskAssignee(taskId, userId),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['taskAssignees', variables.taskId] })
      qc.invalidateQueries({ queryKey: ['tasks'] })
      qc.invalidateQueries({ queryKey: ['tasks', variables.taskId] })
    },
  })
}
