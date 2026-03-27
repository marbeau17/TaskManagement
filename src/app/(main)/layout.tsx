'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Providers } from '@/app/providers'
import { Shell } from '@/components/layout/Shell'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import { useMock } from '@/lib/utils'
import { useI18n } from '@/hooks/useI18n'

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { t } = useI18n()
  const [authChecked, setAuthChecked] = useState(false)

  useEffect(() => {
    if (useMock()) {
      setAuthChecked(true)
      return
    }

    const checkAuth = async () => {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace('/login')
        return
      }

      // Check if user must change password
      const { data: profile } = await supabase
        .from('users')
        .select('must_change_password')
        .eq('id', user.id)
        .single()

      if (profile?.must_change_password) {
        router.replace('/change-password')
        return
      }

      setAuthChecked(true)
    }
    checkAuth()
  }, [router])

  if (!authChecked) {
    return (
      <div className="flex h-screen items-center justify-center bg-wf-bg">
        <div className="text-text3 text-[13px]">{t('auth.checking')}</div>
      </div>
    )
  }

  return (
    <Providers>
      <ErrorBoundary>
        <Shell>{children}</Shell>
      </ErrorBoundary>
    </Providers>
  )
}
