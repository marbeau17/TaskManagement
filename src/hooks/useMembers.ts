'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getMembers, getMemberById, addMember, deleteMember } from '@/lib/data/members'
import type { InviteMemberForm } from '@/types/member'

export function useMembers() {
  return useQuery({
    queryKey: ['members'],
    queryFn: () => getMembers(),
  })
}

export function useMember(id: string) {
  return useQuery({
    queryKey: ['members', id],
    queryFn: () => getMemberById(id),
    enabled: !!id,
  })
}

export function useAddMember() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: InviteMemberForm) => addMember(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] })
    },
  })
}

export function useDeleteMember() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteMember(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] })
    },
  })
}
