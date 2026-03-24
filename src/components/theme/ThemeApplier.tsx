'use client'

import { useTheme } from '@/hooks/useTheme'

/**
 * Invisible component that applies the dark/light class to <html> based on
 * the stored theme preference. Must be rendered at the root layout level so
 * the theme is applied on every page (including login).
 */
export function ThemeApplier() {
  useTheme()
  return null
}
