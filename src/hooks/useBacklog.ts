'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  listBacklogItems,
  createBacklogItem,
  updateBacklogItem,
  deleteBacklogItem,
  promoteBacklogItem,
  type CreateBacklogInput,
  type UpdateBacklogInput,
} from '@/lib/data/backlog'
import { toast } from '@/stores/toastStore'

export function useBacklogItems(projectId?: string) {
  return useQuery({
    queryKey: ['backlog-items', projectId ?? 'all'],
    queryFn: () => listBacklogItems(projectId),
  })
}

export function useCreateBacklogItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateBacklogInput) => createBacklogItem(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['backlog-items'] }),
    onError: (e: any) => toast.error(e?.message || 'Failed to create backlog item'),
  })
}

export function useUpdateBacklogItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateBacklogInput }) =>
      updateBacklogItem(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['backlog-items'] }),
    onError: (e: any) => toast.error(e?.message || 'Failed to update backlog item'),
  })
}

export function useDeleteBacklogItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteBacklogItem(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['backlog-items'] }),
    onError: (e: any) => toast.error(e?.message || 'Failed to delete backlog item'),
  })
}

export function usePromoteBacklogItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      clientName,
      confirmedDeadline,
    }: {
      id: string
      clientName: string
      confirmedDeadline?: string | null
    }) => promoteBacklogItem(id, { clientName, confirmedDeadline }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['backlog-items'] })
      qc.invalidateQueries({ queryKey: ['tasks'] })
      toast.success('Promoted to task')
    },
    onError: (e: any) => toast.error(e?.message || 'Failed to promote backlog item'),
  })
}
