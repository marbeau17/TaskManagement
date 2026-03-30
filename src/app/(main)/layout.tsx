// =============================================================================
// (main) Layout – Server Component with auth guard
//
// This layout performs authentication and must_change_password checks on the
// server side, replacing the previous client-side useEffect approach. This is
// the recommended pattern for Next.js 16+ where middleware is deprecated for
// auth guards.
// =============================================================================

import { redirect } from 'next/navigation'
import { Providers } from '@/app/providers'
import { Shell } from '@/components/layout/Shell'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // In mock mode, skip all auth checks
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const isMock = process.env.NEXT_PUBLIC_USE_MOCK === 'true' || !supabaseUrl || supabaseUrl === '' || supabaseUrl.includes('placeholder')

  if (!isMock) {
    const { createServerSupabaseClient } = await import('@/lib/supabase/server')
    const supabase = await createServerSupabaseClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      redirect('/login')
    }

    // B-003: Enforce password change – prevent bypass via direct URL access
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('must_change_password')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('Profile fetch failed:', profileError.message)
    }

    if (profile?.must_change_password) {
      redirect('/change-password')
    }
  }

  return (
    <Providers>
      <ErrorBoundary>
        <Shell>{children}</Shell>
      </ErrorBoundary>
    </Providers>
  )
}
