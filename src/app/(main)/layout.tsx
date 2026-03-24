'use client'

import { Providers } from '@/app/providers'
import { Shell } from '@/components/layout/Shell'

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <Providers>
      <Shell>{children}</Shell>
    </Providers>
  )
}
