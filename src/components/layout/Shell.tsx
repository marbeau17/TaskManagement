'use client'

import { usePathname } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'

interface ShellProps {
  children: React.ReactNode
}

/**
 * Derive the active sidebar page id from the current pathname.
 */
function deriveActivePage(pathname: string): string {
  // Remove leading slash and split
  const segments = pathname.replace(/^\//, '').split('/')
  const first = segments[0] ?? ''

  // Special case: /tasks/new maps to "request"
  if (first === 'tasks' && segments[1] === 'new') return 'request'

  // Otherwise use the first segment (dashboard, tasks, workload, members, settings)
  return first
}

export function Shell({ children }: ShellProps) {
  const pathname = usePathname()
  const activePage = deriveActivePage(pathname)

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-wf-bg">
      <Sidebar activePage={activePage} />
      <div className="flex-1 flex flex-col overflow-hidden">
        {children}
      </div>
    </div>
  )
}
