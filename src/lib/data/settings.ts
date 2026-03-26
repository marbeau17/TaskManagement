// =============================================================================
// Data abstraction layer – App Settings
// =============================================================================

import { useMock } from '@/lib/utils'

// In-memory store for mock mode
const mockSettings: Record<string, string> = {}

interface SettingRow {
  key: string
  value: string
}

// ---------------------------------------------------------------------------
// getSetting
// ---------------------------------------------------------------------------

export async function getSetting(key: string): Promise<string> {
  if (useMock()) {
    return mockSettings[key] ?? ''
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
    mockSettings[key] = value
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
    return { ...mockSettings }
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
