'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Project, ProjectFilters } from '@/types/project'
import {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
} from '@/lib/data/projects'
import {
  getProjectMembers,
  addProjectMember,
  removeProjectMember,
} from '@/lib/data/project-members'

// ---------------------------------------------------------------------------
// Project hooks
// ---------------------------------------------------------------------------

export function useProjects(filters?: ProjectFilters) {
  return useQuery({
    queryKey: ['projects', filters],
    queryFn: () => getProjects(filters),
  })
}

export function useProject(id: string | undefined) {
  return useQuery({
    queryKey: ['projects', id],
    queryFn: () => getProjectById(id!),
    enabled: !!id,
  })
}

export function useCreateProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (
      data: Omit<Project, 'id' | 'next_issue_seq' | 'created_at' | 'updated_at' | 'pm'>
    ) => createProject(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}

export function useUpdateProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string
      data: Partial<Omit<Project, 'id' | 'created_at' | 'updated_at' | 'pm'>>
    }) => updateProject(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}

export function useDeleteProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteProject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}

// ---------------------------------------------------------------------------
// Project Member hooks (legacy — kept for backwards compatibility)
// ---------------------------------------------------------------------------

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
