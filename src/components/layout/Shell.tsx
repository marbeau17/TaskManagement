'use client'

import { useState, useCallback } from 'react'
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
  const [mobileOpen, setMobileOpen] = useState(false)

  const closeMobile = useCallback(() => setMobileOpen(false), [])

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-wf-bg">
      {/* Desktop sidebar (>1024px): full width */}
      <aside className="hidden lg:flex w-[192px] shrink-0">
        <Sidebar activePage={activePage} />
      </aside>

      {/* Tablet sidebar (768-1024px): collapsed icon-only */}
      <aside className="hidden md:flex lg:hidden w-[56px] shrink-0">
        <Sidebar activePage={activePage} collapsed />
      </aside>

      {/* Mobile overlay sidebar (<768px) */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={closeMobile}
          />
          {/* Sidebar panel */}
          <div className="relative w-[192px] h-full z-50 animate-slide-in-left">
            <Sidebar activePage={activePage} onNavigate={closeMobile} />
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile hamburger bar (<768px) */}
        <div className="md:hidden flex items-center h-[44px] px-[12px] bg-surface border-b border-border2 shrink-0 sticky top-0 z-30">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-[6px] rounded-[6px] text-text2 hover:bg-surf2 transition-colors"
            aria-label="メニューを開く"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
