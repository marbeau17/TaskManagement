'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate,
} from '@/lib/data/templates'
import type { TaskTemplate, TemplateField } from '@/types/template'

// ---------------------------------------------------------------------------
// Query all templates
// ---------------------------------------------------------------------------

export function useTemplates() {
  return useQuery({
    queryKey: ['templates'],
    queryFn: () => getTemplates(),
  })
}

// ---------------------------------------------------------------------------
// Query single template
// ---------------------------------------------------------------------------

export function useTemplate(id: string) {
  return useQuery({
    queryKey: ['templates', id],
    queryFn: () => getTemplateById(id),
    enabled: !!id,
  })
}

// ---------------------------------------------------------------------------
// Create template mutation
// ---------------------------------------------------------------------------

export function useCreateTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; category: string; fields: TemplateField[] }) =>
      createTemplate(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['templates'] })
    },
  })
}

// ---------------------------------------------------------------------------
// Update template mutation
// ---------------------------------------------------------------------------

export function useUpdateTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<TaskTemplate> }) =>
      updateTemplate(id, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['templates'] })
      qc.invalidateQueries({ queryKey: ['templates', variables.id] })
    },
  })
}

// ---------------------------------------------------------------------------
// Delete template mutation
// ---------------------------------------------------------------------------

export function useDeleteTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteTemplate(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['templates'] })
    },
  })
}
