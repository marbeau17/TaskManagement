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
import { toast } from '@/stores/toastStore'
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
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to create task')
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
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to update task progress')
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
      data: Partial<Pick<Task, 'title' | 'description' | 'client_id' | 'desired_deadline' | 'confirmed_deadline' | 'status' | 'assigned_to' | 'priority' | 'planned_hours_per_week' | 'template_data'>>
    }) => updateTask(taskId, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
      qc.invalidateQueries({ queryKey: ['tasks', variables.taskId] })
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to update task')
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
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to assign task')
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
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to update task status')
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
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to assign tasks')
    },
  })
}

export function useBulkDeleteTasks() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (taskIds: string[]) => bulkDeleteTasks(taskIds),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
      toast.success('Tasks deleted successfully')
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to delete tasks')
    },
  })
}

export function useCloneTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (taskId: string) => cloneTask(taskId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks'] }) },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to clone task')
    },
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
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to add comment')
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

export function useTaskStats(period?: 'week' | 'last_week' | 'month' | 'last_month' | 'all') {
  const { data: tasks, ...rest } = useTasks()

  const stats = useMemo(() => {
    if (!tasks) {
      return {
        totalCount: 0,
        activeCount: 0,
        waitingCount: 0,
        todoCount: 0,
        inProgressCount: 0,
        doneCount: 0,
        overdueCount: 0,
        completionRate: 0,
        dueThisWeekCount: 0,
        dueThisMonthCount: 0,
      }
    }

    const now = new Date()

    // Period filtering
    let filteredTasks = tasks
    if (period === 'week') {
      const weekEnd = new Date(now)
      weekEnd.setDate(now.getDate() + (7 - now.getDay()))
      const weekEndStr = weekEnd.toISOString().slice(0, 10)
      filteredTasks = tasks.filter((t) => {
        const deadline = t.confirmed_deadline ?? t.desired_deadline
        if (!deadline) return true
        return deadline <= weekEndStr
      })
    } else if (period === 'last_week') {
      const lastWeekStart = new Date(now)
      lastWeekStart.setDate(now.getDate() - now.getDay() - 7)
      const lastWeekEnd = new Date(lastWeekStart)
      lastWeekEnd.setDate(lastWeekStart.getDate() + 6)
      const startStr = lastWeekStart.toISOString().slice(0, 10)
      const endStr = lastWeekEnd.toISOString().slice(0, 10)
      filteredTasks = tasks.filter((t) => {
        const deadline = t.confirmed_deadline ?? t.desired_deadline
        if (!deadline) return true
        return deadline >= startStr && deadline <= endStr
      })
    } else if (period === 'month') {
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      const monthEndStr = monthEnd.toISOString().slice(0, 10)
      filteredTasks = tasks.filter((t) => {
        const deadline = t.confirmed_deadline ?? t.desired_deadline
        if (!deadline) return true
        return deadline <= monthEndStr
      })
    } else if (period === 'last_month') {
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)
      const startStr = lastMonthStart.toISOString().slice(0, 10)
      const endStr = lastMonthEnd.toISOString().slice(0, 10)
      filteredTasks = tasks.filter((t) => {
        const deadline = t.confirmed_deadline ?? t.desired_deadline
        if (!deadline) return true
        return deadline >= startStr && deadline <= endStr
      })
    }

    const totalCount = filteredTasks.length
    const activeCount = filteredTasks.filter((t) => t.status !== 'done' && t.status !== 'rejected').length
    const waitingCount = filteredTasks.filter((t) => t.status === 'waiting').length
    const todoCount = filteredTasks.filter((t) => t.status === 'todo').length
    const inProgressCount = filteredTasks.filter((t) => t.status === 'in_progress').length
    const doneCount = filteredTasks.filter((t) => t.status === 'done').length
    const overdueCount = filteredTasks.filter((t) => {
      if (t.status === 'done') return false
      const deadline = t.confirmed_deadline ?? t.desired_deadline
      if (!deadline) return false
      return new Date(deadline) < now
    }).length
    const completionRate = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0

    // Additional period counts (always computed from all tasks)
    const weekEnd2 = new Date(now)
    weekEnd2.setDate(now.getDate() + (7 - now.getDay()))
    const weekEndStr2 = weekEnd2.toISOString().slice(0, 10)
    const monthEnd2 = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    const monthEndStr2 = monthEnd2.toISOString().slice(0, 10)

    const dueThisWeekCount = tasks.filter((t) => {
      if (t.status === 'done' || t.status === 'rejected') return false
      const deadline = t.confirmed_deadline ?? t.desired_deadline
      return deadline && deadline <= weekEndStr2
    }).length

    const dueThisMonthCount = tasks.filter((t) => {
      if (t.status === 'done' || t.status === 'rejected') return false
      const deadline = t.confirmed_deadline ?? t.desired_deadline
      return deadline && deadline <= monthEndStr2
    }).length

    return {
      totalCount,
      activeCount,
      waitingCount,
      todoCount,
      inProgressCount,
      doneCount,
      overdueCount,
      completionRate,
      dueThisWeekCount,
      dueThisMonthCount,
    }
  }, [tasks, period])

  return { ...rest, data: stats }
}
