'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getClients,
  createClient,
  updateClient,
  deleteClient,
} from '@/lib/data/clients'
import { toast } from '@/stores/toastStore'

export function useClients() {
  return useQuery({
    queryKey: ['clients'],
    queryFn: () => getClients(),
  })
}

export function useCreateClient() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => createClient(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to create client')
    },
  })
}

export function useUpdateClient() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      updateClient(id, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to update client')
    },
  })
}

export function useDeleteClient() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteClient(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      toast.success('Client deleted successfully')
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to delete client')
    },
  })
}
