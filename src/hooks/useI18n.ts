'use client'
import { useCallback } from 'react'
import { useUiStore } from '@/stores/uiStore'
import { translations, Locale } from '@/lib/i18n/translations'

export function useI18n() {
  const { locale, setLocale } = useUiStore()

  const t = useCallback((key: string): string => {
    return translations[locale]?.[key] || translations['ja'][key] || key
  }, [locale])

  return { t, locale, setLocale }
}
