'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { ProjectTemplateCreateInput } from '@/types/project'
import {
  getProjectTemplates,
  createProjectTemplate,
  saveProjectAsTemplate,
  createProjectFromTemplate,
  deleteProjectTemplate,
} from '@/lib/data/project-templates'

// ---------------------------------------------------------------------------
// Query all project templates
// ---------------------------------------------------------------------------

export function useProjectTemplates() {
  return useQuery({
    queryKey: ['project-templates'],
    queryFn: () => getProjectTemplates(),
  })
}

// ---------------------------------------------------------------------------
// Create a new project template
// ---------------------------------------------------------------------------

export function useCreateProjectTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: ProjectTemplateCreateInput) => createProjectTemplate(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-templates'] })
    },
  })
}

// ---------------------------------------------------------------------------
// Save an existing project as a template
// ---------------------------------------------------------------------------

export function useSaveProjectAsTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      projectId,
      templateName,
      templateDescription,
    }: {
      projectId: string
      templateName: string
      templateDescription: string
    }) => saveProjectAsTemplate(projectId, templateName, templateDescription),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-templates'] })
    },
  })
}

// ---------------------------------------------------------------------------
// Create a project from a template
// ---------------------------------------------------------------------------

export function useCreateProjectFromTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      templateId,
      projectName,
      keyPrefix,
      pmId,
    }: {
      templateId: string
      projectName: string
      keyPrefix: string
      pmId?: string | null
    }) => createProjectFromTemplate(templateId, projectName, keyPrefix, pmId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}

// ---------------------------------------------------------------------------
// Delete a project template
// ---------------------------------------------------------------------------

export function useDeleteProjectTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteProjectTemplate(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-templates'] })
    },
  })
}
