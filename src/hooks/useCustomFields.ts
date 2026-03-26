'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type {
  CreateCustomFieldDefinition,
  UpdateCustomFieldDefinition,
} from '@/types/database'
import {
  getFieldDefinitions,
  createFieldDefinition,
  updateFieldDefinition,
  deleteFieldDefinition,
  reorderFieldDefinitions,
  getFieldValues,
  upsertFieldValue,
  bulkUpsertFieldValues,
} from '@/lib/data/custom-fields'

// ---------------------------------------------------------------------------
// Definitions
// ---------------------------------------------------------------------------

export function useFieldDefinitions(projectId: string | undefined) {
  return useQuery({
    queryKey: ['custom-field-definitions', projectId],
    queryFn: () => getFieldDefinitions(projectId!),
    enabled: !!projectId,
  })
}

export function useCreateFieldDefinition() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateCustomFieldDefinition) =>
      createFieldDefinition(data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['custom-field-definitions', variables.project_id],
      })
    },
  })
}

export function useUpdateFieldDefinition() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string
      projectId: string
      data: UpdateCustomFieldDefinition
    }) => updateFieldDefinition(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['custom-field-definitions', variables.projectId],
      })
    },
  })
}

export function useDeleteFieldDefinition() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id }: { id: string; projectId: string }) =>
      deleteFieldDefinition(id),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['custom-field-definitions', variables.projectId],
      })
    },
  })
}

export function useReorderFieldDefinitions() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      orderedIds,
    }: {
      orderedIds: string[]
      projectId: string
    }) => reorderFieldDefinitions(orderedIds),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['custom-field-definitions', variables.projectId],
      })
    },
  })
}

// ---------------------------------------------------------------------------
// Values
// ---------------------------------------------------------------------------

export function useFieldValues(
  entityType: 'issue' | 'task',
  entityId: string | undefined
) {
  return useQuery({
    queryKey: ['custom-field-values', entityType, entityId],
    queryFn: () => getFieldValues(entityType, entityId!),
    enabled: !!entityId,
  })
}

export function useUpsertFieldValue() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      entityType,
      entityId,
      fieldId,
      value,
    }: {
      entityType: 'issue' | 'task'
      entityId: string
      fieldId: string
      value: unknown
    }) => upsertFieldValue(entityType, entityId, fieldId, value),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: [
          'custom-field-values',
          variables.entityType,
          variables.entityId,
        ],
      })
    },
  })
}

export function useBulkUpsertFieldValues() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      entityType,
      entityId,
      values,
    }: {
      entityType: 'issue' | 'task'
      entityId: string
      values: Record<string, unknown>
    }) => bulkUpsertFieldValues(entityType, entityId, values),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: [
          'custom-field-values',
          variables.entityType,
          variables.entityId,
        ],
      })
    },
  })
}
