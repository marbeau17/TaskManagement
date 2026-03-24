'use client'

import { useCallback, useEffect } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { changePassword } from '@/lib/data/members'
import type { User } from '@/types/database'

const useMock = () => process.env.NEXT_PUBLIC_USE_MOCK === 'true'

/** Default mock user: director */
const MOCK_DIRECTOR: User = {
  id: 'u2',
  email: 'o.yasuda@meetsc.co.jp',
  name: '安田 修',
  name_short: '安',
  role: 'director',
  avatar_color: 'av-b',
  weekly_capacity_hours: 40,
  is_active: true,
  must_change_password: false,
  created_at: '2020-01-01T00:00:00Z',
  updated_at: '2020-01-01T00:00:00Z',
}

/**
 * Auth hook that integrates with Supabase Auth in non-mock mode,
 * and uses mock data in mock mode.
 */
export function useAuth() {
  const { user, setUser, isAuthenticated } = useAuthStore()

  // On mount, check for existing Supabase session (non-mock only)
  useEffect(() => {
    if (useMock() || user) return

    const checkSession = async () => {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (authUser) {
        // Fetch full user profile from public.users
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .single()
        if (profile) setUser(profile as User)
      }
    }
    checkSession()
  }, [user, setUser])

  const login = useCallback(
    async (email: string, password: string): Promise<User | null> => {
      if (useMock()) {
        const { loginUser } = await import('@/lib/data/members')
        const u = await loginUser(email, password)
        if (u) setUser(u)
        return u
      }

      // Real Supabase auth
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error || !data.user) return null

      // Fetch full profile from public.users
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .single()

      if (profile) {
        setUser(profile as User)
        return profile as User
      }
      return null
    },
    [setUser]
  )

  const logout = useCallback(async () => {
    if (!useMock()) {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      await supabase.auth.signOut()
    }
    setUser(null)
  }, [setUser])

  // For mock mode, auto-init with default director
  const currentUser = useMock() && !user ? MOCK_DIRECTOR : user

  return {
    user: currentUser,
    isLoading: false,
    isAuthenticated: useMock() ? true : isAuthenticated,
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
