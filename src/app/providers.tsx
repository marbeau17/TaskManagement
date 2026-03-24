'use client'

import { useState, useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/authStore'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: 1,
          },
        },
      })
  )

  // Listen for Supabase auth state changes (non-mock only)
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_USE_MOCK === 'true') return

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
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}
