'use client'

import { useEffect } from 'react'
import { useUiStore } from '@/stores/uiStore'

export function useTheme() {
  const theme = useUiStore((s) => s.theme)
  const setTheme = useUiStore((s) => s.setTheme)

  // Hydrate theme from localStorage on mount.
  // The zustand store may have been created during SSR with the default
  // value ('system'). On the client we re-read localStorage so the store
  // reflects the user's persisted preference.
  useEffect(() => {
    const stored = localStorage.getItem('workflow-theme') as
      | 'light'
      | 'dark'
      | 'system'
      | null
    if (stored && stored !== theme) {
      setTheme(stored)
    }
    // Run only once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const root = document.documentElement
    const apply = (isDark: boolean) => {
      if (isDark) {
        root.classList.add('dark')
      } else {
        root.classList.remove('dark')
      }
    }

    // Always persist the preference so it survives page reloads
    localStorage.setItem('workflow-theme', theme)

    if (theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      apply(mq.matches)
      const handler = (e: MediaQueryListEvent) => apply(e.matches)
      mq.addEventListener('change', handler)
      return () => mq.removeEventListener('change', handler)
    }

    apply(theme === 'dark')
  }, [theme])

  return { theme, setTheme }
}
