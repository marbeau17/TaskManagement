// =============================================================================
// Data abstraction layer – App Settings
// =============================================================================

import { useMock } from '@/lib/utils'

// localStorage-backed store for mock mode (persists across reloads)
function getMockSettings(): Record<string, string> {
  if (typeof window === 'undefined') return {}
  try {
    return JSON.parse(localStorage.getItem('workflow-settings') || '{}')
  } catch { return {} }
}

function setMockSettings(settings: Record<string, string>) {
  if (typeof window === 'undefined') return
  localStorage.setItem('workflow-settings', JSON.stringify(settings))
}

interface SettingRow {
  key: string
  value: string
}

// ---------------------------------------------------------------------------
// getSetting
// ---------------------------------------------------------------------------

export async function getSetting(key: string): Promise<string> {
  if (useMock()) {
    return getMockSettings()[key] ?? ''
  }

  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()

  const { data, error } = await (supabase as any)
    .from('app_settings')
    .select('value')
    .eq('key', key)
    .single()

  if (error) return ''
  return (data as SettingRow | null)?.value ?? ''
}

// ---------------------------------------------------------------------------
// setSetting
// ---------------------------------------------------------------------------

export async function setSetting(key: string, value: string): Promise<void> {
  if (useMock()) {
    const settings = getMockSettings()
    settings[key] = value
    setMockSettings(settings)
    return
  }

  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()

  const { error } = await (supabase as any)
    .from('app_settings')
    .upsert({ key, value }, { onConflict: 'key' })

  if (error) throw error
}

// ---------------------------------------------------------------------------
// getAllSettings
// ---------------------------------------------------------------------------

export async function getAllSettings(): Promise<Record<string, string>> {
  if (useMock()) {
    return { ...getMockSettings() }
  }

  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()

  const { data, error } = await (supabase as any)
    .from('app_settings')
    .select('key, value')

  if (error) throw error

  const result: Record<string, string> = {}
  for (const row of (data ?? []) as SettingRow[]) {
    result[row.key] = row.value
  }
  return result
}
