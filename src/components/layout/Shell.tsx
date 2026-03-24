'use client'

import { Sidebar } from '@/components/layout/Sidebar'

interface ShellProps {
  activePage: string
  children: React.ReactNode
}

export function Shell({ activePage, children }: ShellProps) {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-wf-bg">
      <Sidebar activePage={activePage} />
      <div className="flex-1 flex flex-col overflow-hidden">
        {children}
      </div>
    </div>
  )
}
