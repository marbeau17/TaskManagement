'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { CreateMilestoneData, UpdateMilestoneData } from '@/types/project'
import {
  getMilestones,
  createMilestone,
  updateMilestone,
  deleteMilestone,
} from '@/lib/data/milestones'

export function useMilestones(projectId: string | undefined) {
  return useQuery({
    queryKey: ['milestones', projectId],
    queryFn: () => getMilestones(projectId!),
    enabled: !!projectId,
  })
}

export function useCreateMilestone() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateMilestoneData) => createMilestone(data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['milestones', variables.project_id] })
    },
  })
}

export function useUpdateMilestone() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data, projectId }: { id: string; data: UpdateMilestoneData; projectId: string }) =>
      updateMilestone(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['milestones', variables.projectId] })
    },
  })
}

export function useDeleteMilestone() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, projectId }: { id: string; projectId: string }) =>
      deleteMilestone(id),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['milestones', variables.projectId] })
    },
  })
}
