// =============================================================================
// Data abstraction layer – App Settings
// Uses server-side API route to bypass RLS restrictions
// =============================================================================

import { isMockMode } from '@/lib/utils'

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

// ---------------------------------------------------------------------------
// getSetting
// ---------------------------------------------------------------------------

export async function getSetting(key: string): Promise<string> {
  if (isMockMode()) {
    return getMockSettings()[key] ?? ''
  }

  try {
    const res = await fetch(`/api/settings?key=${encodeURIComponent(key)}`)
    if (!res.ok) return ''
    const data = await res.json()
    return data.value ?? ''
  } catch {
    return ''
  }
}

// ---------------------------------------------------------------------------
// setSetting
// ---------------------------------------------------------------------------

export async function setSetting(key: string, value: string): Promise<void> {
  if (isMockMode()) {
    const settings = getMockSettings()
    settings[key] = value
    setMockSettings(settings)
    return
  }

  try {
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      console.warn('[Settings] setSetting error:', data.error)
    }
  } catch (err) {
    console.warn('[Settings] setSetting error:', err)
  }
}

// ---------------------------------------------------------------------------
// getAllSettings
// ---------------------------------------------------------------------------

export async function getAllSettings(): Promise<Record<string, string>> {
  if (isMockMode()) {
    return { ...getMockSettings() }
  }

  try {
    const res = await fetch('/api/settings')
    if (!res.ok) return {}
    return await res.json()
  } catch {
    return {}
  }
}
