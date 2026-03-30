'use client'

import { useState, useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/authStore'
import { APP_CONFIG } from '@/lib/config'
import { useTheme } from '@/hooks/useTheme'

/** Ensures dark/light theme is applied inside the Providers tree */
function ThemeInit() {
  useTheme()
  return null
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: (failureCount, error: any) => {
              // Don't retry on auth errors
              if (error?.status === 401 || error?.status === 403) return false
              // Don't retry on not found
              if (error?.status === 404) return false
              // Retry up to 2 times for other errors
              return failureCount < 2
            },
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, APP_CONFIG.cache.queryMaxRetryDelayMs),
            staleTime: APP_CONFIG.cache.queryStaleTimeMs,
            refetchOnWindowFocus: true,
            refetchOnReconnect: true,
          },
          mutations: {
            retry: false,
          },
        },
      })
  )

  // Listen for Supabase auth state changes (non-mock only)
  useEffect(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!supabaseUrl || supabaseUrl === '' || supabaseUrl.includes('placeholder')) return

    let subscription: { unsubscribe: () => void } | null = null

    const setup = async () => {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data: { subscription: sub } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (event === 'SIGNED_OUT' || !session?.user) {
            useAuthStore.getState().setUser(null)
          }
        }
      )
      subscription = sub
    }
    setup()

    return () => { subscription?.unsubscribe() }
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeInit />
      {children}
    </QueryClientProvider>
  )
}
