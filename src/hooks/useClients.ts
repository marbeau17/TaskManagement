'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getClients,
  createClient,
  updateClient,
  deleteClient,
} from '@/lib/data/clients'

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
  })
}

export function useDeleteClient() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteClient(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
    },
  })
}
