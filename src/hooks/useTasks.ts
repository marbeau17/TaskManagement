'use client'

import { useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getTasks,
  getTaskById,
  getSubtasks,
  createTask,
  updateTask,
  updateTaskProgress,
  assignTask,
  bulkUpdateTaskStatus,
  getComments,
  addComment,
  getActivityLogs,
  getRecentActivityLogs,
  getAttachments,
  getWaitingTaskCount,
  cloneTask,
  bulkAssignTasks,
  bulkDeleteTasks,
} from '@/lib/data/tasks'
import type { Task, TaskStatus } from '@/types/database'
import { useRealtimeComments, useRealtimeTaskStatus } from './useRealtimeSubscription'
import type {
  TaskFilters,
  TaskFormStep1,
  TaskFormStep2,
  TaskProgressUpdate,
  PaginationParams,
} from '@/types/task'

// ---------------------------------------------------------------------------
// Task list & detail
// ---------------------------------------------------------------------------

export function useTasks(filters?: TaskFilters, pagination?: PaginationParams) {
  useRealtimeTaskStatus()
  return useQuery({
    queryKey: ['tasks', filters, pagination],
    queryFn: () => getTasks(filters, pagination),
    select: (result) => result.data,
  })
}

export function useTask(id: string) {
  useRealtimeTaskStatus(id)
  return useQuery({
    queryKey: ['tasks', id],
    queryFn: () => getTaskById(id),
    enabled: !!id,
  })
}

export function useWaitingTaskCount() {
  return useQuery({
    queryKey: ['tasks', 'waitingCount'],
    queryFn: getWaitingTaskCount,
  })
}

export function useSubtasks(parentId: string) {
  return useQuery({
    queryKey: ['subtasks', parentId],
    queryFn: () => getSubtasks(parentId),
    enabled: !!parentId,
  })
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export function useCreateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      step1,
      step2,
    }: {
      step1: TaskFormStep1
      step2?: TaskFormStep2
    }) => createTask(step1, step2),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}

export function useUpdateTaskProgress() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      taskId,
      update,
    }: {
      taskId: string
      update: TaskProgressUpdate
    }) => updateTaskProgress(taskId, update),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
      qc.invalidateQueries({ queryKey: ['tasks', variables.taskId] })
      qc.invalidateQueries({
        queryKey: ['activityLogs', variables.taskId],
      })
    },
  })
}

export function useUpdateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      taskId,
      data,
    }: {
      taskId: string
      data: Partial<Pick<Task, 'title' | 'description' | 'client_id' | 'desired_deadline' | 'confirmed_deadline' | 'status' | 'assigned_to' | 'priority' | 'planned_hours_per_week'>>
    }) => updateTask(taskId, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
      qc.invalidateQueries({ queryKey: ['tasks', variables.taskId] })
    },
  })
}

export function useAssignTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      taskId,
      step2,
    }: {
      taskId: string
      step2: TaskFormStep2
    }) => assignTask(taskId, step2),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
      qc.invalidateQueries({ queryKey: ['tasks', variables.taskId] })
      qc.invalidateQueries({
        queryKey: ['activityLogs', variables.taskId],
      })
    },
  })
}

// ---------------------------------------------------------------------------
// Bulk status update
// ---------------------------------------------------------------------------

export function useBulkUpdateTaskStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      taskIds,
      status,
    }: {
      taskIds: string[]
      status: TaskStatus
    }) => bulkUpdateTaskStatus(taskIds, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}

// ---------------------------------------------------------------------------
// Comments
// ---------------------------------------------------------------------------

export function useBulkAssignTasks() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ taskIds, userId }: { taskIds: string[]; userId: string }) =>
      bulkAssignTasks(taskIds, userId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks'] }) },
  })
}

export function useBulkDeleteTasks() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (taskIds: string[]) => bulkDeleteTasks(taskIds),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks'] }) },
  })
}

export function useCloneTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (taskId: string) => cloneTask(taskId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks'] }) },
  })
}

export function useComments(taskId: string) {
  useRealtimeComments(taskId)
  return useQuery({
    queryKey: ['comments', taskId],
    queryFn: () => getComments(taskId),
    enabled: !!taskId,
  })
}

export function useAddComment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      taskId,
      body,
    }: {
      taskId: string
      body: string
    }) => addComment(taskId, body),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['comments', variables.taskId] })
      qc.invalidateQueries({
        queryKey: ['activityLogs', variables.taskId],
      })
    },
  })
}

// ---------------------------------------------------------------------------
// Activity logs
// ---------------------------------------------------------------------------

export function useActivityLogs(taskId: string) {
  return useQuery({
    queryKey: ['activityLogs', taskId],
    queryFn: () => getActivityLogs(taskId),
    enabled: !!taskId,
  })
}

export function useRecentActivityLogs(limit = 5) {
  return useQuery({
    queryKey: ['recentActivityLogs', limit],
    queryFn: () => getRecentActivityLogs(limit),
  })
}

// ---------------------------------------------------------------------------
// Attachments
// ---------------------------------------------------------------------------

export function useAttachments(taskId: string) {
  return useQuery({
    queryKey: ['attachments', taskId],
    queryFn: () => getAttachments(taskId),
    enabled: !!taskId,
  })
}

// ---------------------------------------------------------------------------
// Dashboard stats (computed)
// ---------------------------------------------------------------------------

export function useTaskStats() {
  const { data: tasks, ...rest } = useTasks()

  const stats = useMemo(() => {
    if (!tasks) {
      return {
        totalCount: 0,
        waitingCount: 0,
        todoCount: 0,
        inProgressCount: 0,
        doneCount: 0,
        overdueCount: 0,
        completionRate: 0,
      }
    }

    const now = new Date()
    const totalCount = tasks.length
    const waitingCount = tasks.filter((t) => t.status === 'waiting').length
    const todoCount = tasks.filter((t) => t.status === 'todo').length
    const inProgressCount = tasks.filter(
      (t) => t.status === 'in_progress'
    ).length
    const doneCount = tasks.filter((t) => t.status === 'done').length
    const overdueCount = tasks.filter((t) => {
      if (t.status === 'done') return false
      const deadline = t.confirmed_deadline ?? t.desired_deadline
      if (!deadline) return false
      return new Date(deadline) < now
    }).length
    const completionRate =
      totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0

    return {
      totalCount,
      waitingCount,
      todoCount,
      inProgressCount,
      doneCount,
      overdueCount,
      completionRate,
    }
  }, [tasks])

  return { ...rest, data: stats }
}
