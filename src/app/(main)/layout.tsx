'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Providers } from '@/app/providers'
import { Shell } from '@/components/layout/Shell'
import { useMock } from '@/lib/utils'

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
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
      } else {
        setAuthChecked(true)
      }
    }
    checkAuth()
  }, [router])

  if (!authChecked) {
    return (
      <div className="flex h-screen items-center justify-center bg-wf-bg">
        <div className="text-text3 text-[13px]">認証を確認中...</div>
      </div>
    )
  }

  return (
    <Providers>
      <Shell>{children}</Shell>
    </Providers>
  )
}
