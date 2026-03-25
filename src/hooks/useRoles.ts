'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getCustomRoles, addCustomRole, deleteCustomRole } from '@/lib/data/roles'
import { BUILTIN_ROLES } from '@/lib/constants'

export function useAllRoles() {
  const { data: customRoles = [] } = useQuery({
    queryKey: ['customRoles'],
    queryFn: getCustomRoles,
  })
  // Combine built-in + custom
  const allRoles = [...BUILTIN_ROLES, ...customRoles.map((r) => r.name)]
  return { allRoles, customRoles }
}

export function useAddCustomRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => addCustomRole(name),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customRoles'] }),
  })
}

export function useDeleteCustomRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteCustomRole(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customRoles'] }),
  })
}
