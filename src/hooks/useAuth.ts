'use client'

import { useCallback } from 'react'
import { useAuthStore } from '@/stores/authStore'
import type { User } from '@/types/database'

/** Default mock user: director (田中太郎) */
const MOCK_DIRECTOR: User = {
  id: 'user-1',
  email: 'tanaka@example.com',
  name: '田中太郎',
  name_short: '田中',
  role: 'director',
  avatar_color: 'av-a',
  weekly_capacity_hours: 40,
  is_active: true,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
}

/**
 * Simple mock auth hook.
 * In production this would integrate with Supabase Auth.
 */
export function useAuth() {
  const { user, setUser, isAuthenticated } = useAuthStore()

  // Auto-initialize with mock director if no user is set
  const currentUser = user ?? MOCK_DIRECTOR

  const login = useCallback(
    (u?: User) => {
      setUser(u ?? MOCK_DIRECTOR)
    },
    [setUser]
  )

  const logout = useCallback(() => {
    setUser(null)
  }, [setUser])

  return {
    user: currentUser,
    isLoading: false,
    isAuthenticated: isAuthenticated || user === null, // auto-authenticated in mock mode
    login,
    logout,
  }
}
