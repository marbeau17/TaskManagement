'use client'

import { useCallback } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { loginUser, changePassword } from '@/lib/data/members'
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
 * Auth hook that integrates with the data layer for login/password management.
 */
export function useAuth() {
  const { user, setUser, isAuthenticated } = useAuthStore()

  // Auto-initialize with mock director if no user is set
  const currentUser = user ?? MOCK_DIRECTOR

  const login = useCallback(
    async (email: string, password: string): Promise<User | null> => {
      const loggedInUser = await loginUser(email, password)
      if (loggedInUser) {
        setUser(loggedInUser)
        return loggedInUser
      }
      return null
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

/**
 * Hook for changing the current user's password.
 */
export function useChangePassword() {
  const { user } = useAuthStore()

  const change = useCallback(
    async (
      oldPassword: string,
      newPassword: string
    ): Promise<{ success: boolean; error?: string }> => {
      if (!user) {
        return { success: false, error: 'Not authenticated' }
      }
      return changePassword(user.id, oldPassword, newPassword)
    },
    [user]
  )

  return { changePassword: change }
}
