'use client'

import { useCallback, useEffect } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { changePassword } from '@/lib/data/members'
import { isMockMode } from '@/lib/utils'
import type { User } from '@/types/database'

/** Default mock user: director */
const MOCK_DIRECTOR: User = {
  id: 'u2',
  email: 'o.yasuda@meetsc.co.jp',
  name: '安田 修',
  name_short: '安',
  role: 'admin',
  avatar_color: 'av-b',
  weekly_capacity_hours: 40,
  is_active: true,
  must_change_password: false,
  manager_id: 'u1',
  level: 'L2',
  department: 'コンサルティング事業本部',
  title: 'COO',
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
    if (isMockMode() || user) return

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
        if (profile) {
          setUser(profile as User)
          return
        }
        // Retry via server-side API route (bypasses RLS)
        try {
          const res = await fetch(`/api/auth/profile?userId=${authUser.id}`)
          if (res.ok) {
            const apiProfile = await res.json()
            setUser(apiProfile as User)
            return
          }
        } catch (fetchErr) {
          console.warn('Session profile fetch failed:', fetchErr)
        }
        // B-008: Fallback with least-privileged role
        console.warn('Session profile fetch failed for all methods, using least-privileged fallback')
        setUser({
          id: authUser.id,
          email: authUser.email || '',
          name: (authUser.email || '').split('@')[0],
          name_short: (authUser.email || '?').charAt(0),
          role: 'requester',
          avatar_color: 'av-a',
          weekly_capacity_hours: 16,
          is_active: true,
          must_change_password: false,
          manager_id: null,
          level: '',
          department: '',
          title: '',
          created_at: authUser.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
      }
    }
    checkSession()
  }, [user, setUser])

  const login = useCallback(
    async (email: string, password: string): Promise<User | null> => {
      if (isMockMode()) {
        const { loginUser } = await import('@/lib/data/members')
        const u = await loginUser(email, password)
        if (u) setUser(u)
        return u
      }

      // Real Supabase auth
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()

      // Step 1: Authenticate
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        console.error('Auth error:', error.message)
        throw new Error(error.message)
      }
      if (!data.user) return null

      // Step 2: Fetch profile (may fail due to RLS timing)
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .single()

      if (profile) {
        setUser(profile as User)
        return profile as User
      }

      // Step 3: Try server-side API route (bypasses RLS)
      try {
        const res = await fetch(`/api/auth/profile?userId=${data.user.id}`)
        if (res.ok) {
          const apiProfile = await res.json()
          setUser(apiProfile as User)
          return apiProfile as User
        }
      } catch (fetchErr) {
        console.warn('API profile fetch failed:', fetchErr)
      }

      // Fallback: construct basic user from auth data
      console.warn('Profile fetch failed, using auth data fallback:', profileError?.message)
      // B-008: Always use least-privileged role — never trust user_metadata.role
      const inferredRole = 'requester' as const
      const fallbackUser: User = {
        id: data.user.id,
        email: data.user.email || email,
        name: data.user.user_metadata?.name || email.split('@')[0],
        name_short: (data.user.user_metadata?.name || email.split('@')[0]).charAt(0),
        role: inferredRole,
        avatar_color: 'av-a',
        weekly_capacity_hours: 16,
        is_active: true,
        must_change_password: false,
        manager_id: null,
        level: '',
        department: '',
        title: '',
        created_at: data.user.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      setUser(fallbackUser)
      return fallbackUser
    },
    [setUser]
  )

  const logout = useCallback(async () => {
    if (!isMockMode()) {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      await supabase.auth.signOut()
    }
    setUser(null)
  }, [setUser])

  // For mock mode, auto-init with default director
  const currentUser = isMockMode() && !user ? MOCK_DIRECTOR : user

  return {
    user: currentUser,
    isLoading: false,
    isAuthenticated: isMockMode() ? true : isAuthenticated,
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
