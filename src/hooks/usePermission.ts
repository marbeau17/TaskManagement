'use client'

import { useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { getPermissions } from '@/lib/data/permissions'
import type { Permission } from '@/lib/data/permissions'

export function usePermission() {
  const { user } = useAuth()

  const { data: permissions } = useQuery<Permission[]>({
    queryKey: ['permissions'],
    queryFn: getPermissions,
    staleTime: 5 * 60 * 1000, // cache for 5 minutes
  })

  const can = useCallback(
    (resource: string, action: string): boolean => {
      if (!user) return false

      return (
        permissions?.some(
          (p) =>
            p.role === user.role &&
            p.allowed &&
            (p.resource === '*' || p.resource === resource) &&
            (p.action === '*' || p.action === action)
        ) ?? false
      )
    },
    [user, permissions]
  )

  return { can }
}
