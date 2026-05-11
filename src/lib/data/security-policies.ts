import { isMockMode } from '@/lib/utils'

export interface SecurityPolicy {
  id: number
  password_max_age_days: number
  warn_before_days: number
  enforcement_mode: 'graduated' | 'warn_only' | 'strict'
  reminder_email_enabled: boolean
  enabled: boolean
  updated_at: string
  updated_by: string | null
}

const DEFAULT_POLICY: SecurityPolicy = {
  id: 1,
  password_max_age_days: 30,
  warn_before_days: 7,
  enforcement_mode: 'graduated',
  reminder_email_enabled: true,
  enabled: true,
  updated_at: new Date().toISOString(),
  updated_by: null,
}

export async function getSecurityPolicy(): Promise<SecurityPolicy> {
  if (isMockMode()) return DEFAULT_POLICY
  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()
  const { data, error } = await (supabase as any)
    .from('security_policies')
    .select('*')
    .eq('id', 1)
    .maybeSingle()
  if (error || !data) return DEFAULT_POLICY
  return data as SecurityPolicy
}

export async function updateSecurityPolicy(
  patch: Partial<Pick<SecurityPolicy, 'password_max_age_days' | 'warn_before_days' | 'enforcement_mode' | 'reminder_email_enabled' | 'enabled'>>,
  updatedBy: string,
): Promise<{ success: boolean; error?: string }> {
  const res = await fetch('/api/security-policies', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...patch, updated_by: updatedBy }),
  })
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}))
    return { success: false, error: detail.error || `HTTP ${res.status}` }
  }
  return { success: true }
}

/**
 * 残日数 (期限まで何日) を計算する。
 *   正の値: あと N 日で期限
 *   0: 当日
 *   負の値: 期限超過 N 日
 */
export function calcDaysRemaining(
  passwordChangedAt: string | null | undefined,
  maxAgeDays: number,
  nowMs: number = Date.now(),
): number | null {
  if (!passwordChangedAt) return null
  const changedMs = new Date(passwordChangedAt).getTime()
  if (Number.isNaN(changedMs)) return null
  const ageDays = Math.floor((nowMs - changedMs) / (1000 * 60 * 60 * 24))
  return maxAgeDays - ageDays
}
