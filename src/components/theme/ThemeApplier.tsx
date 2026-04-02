'use client'

import { useEffect } from 'react'
import { useTheme } from '@/hooks/useTheme'
import { useUiStore } from '@/stores/uiStore'

/**
 * Invisible component that applies the dark/light class to <html> based on
 * the stored theme preference. Must be rendered at the root layout level so
 * the theme is applied on every page (including login).
 */
export function ThemeApplier() {
  useTheme()

  const colorTheme = useUiStore((s) => s.colorTheme)

  // Sync color theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', colorTheme)
  }, [colorTheme])

  return null
}
