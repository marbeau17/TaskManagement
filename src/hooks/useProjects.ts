'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getProjectMembers,
  addProjectMember,
  removeProjectMember,
} from '@/lib/data/projects'

export function useProjectMembers(projectName?: string) {
  return useQuery({
    queryKey: ['project-members', projectName],
    queryFn: () => getProjectMembers(projectName),
  })
}

export function useAddProjectMember() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      projectName,
      pmId,
      memberId,
      allocatedHours,
    }: {
      projectName: string
      pmId: string
      memberId: string
      allocatedHours: number
    }) => addProjectMember(projectName, pmId, memberId, allocatedHours),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-members'] })
    },
  })
}

export function useRemoveProjectMember() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => removeProjectMember(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-members'] })
    },
  })
}
