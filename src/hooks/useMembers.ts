'use client'

import { useQuery } from '@tanstack/react-query'
import { getMembers, getMemberById } from '@/lib/data/members'

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
