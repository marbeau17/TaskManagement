'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  listAssets,
  createAsset,
  updateAsset,
  deleteAsset,
  bulkCreateAssets,
  type CreateAssetInput,
  type UpdateAssetInput,
} from '@/lib/data/assets'
import { toast } from '@/stores/toastStore'

export function useAssets() {
  return useQuery({
    queryKey: ['assets'],
    queryFn: () => listAssets(),
  })
}

export function useCreateAsset() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateAssetInput) => createAsset(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['assets'] }),
    onError: (e: any) => toast.error(e?.message || 'Failed to create asset'),
  })
}

export function useUpdateAsset() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateAssetInput }) =>
      updateAsset(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['assets'] }),
    onError: (e: any) => toast.error(e?.message || 'Failed to update asset'),
  })
}

export function useDeleteAsset() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteAsset(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['assets'] }),
    onError: (e: any) => toast.error(e?.message || 'Failed to delete asset'),
  })
}

export function useBulkCreateAssets() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (inputs: CreateAssetInput[]) => bulkCreateAssets(inputs),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['assets'] }),
    onError: (e: any) => toast.error(e?.message || 'Failed to bulk create assets'),
  })
}
