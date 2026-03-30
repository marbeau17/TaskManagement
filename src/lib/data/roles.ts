import { isMockMode } from '@/lib/utils'

export interface CustomRole {
  id: string
  name: string
  created_at: string
}

export async function getCustomRoles(): Promise<CustomRole[]> {
  if (isMockMode()) {
    return [] // no custom roles in mock
  }
  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()
  const { data } = await supabase.from('custom_roles').select('*').order('name')
  return (data ?? []) as CustomRole[]
}

export async function addCustomRole(name: string): Promise<CustomRole> {
  if (isMockMode()) return { id: crypto.randomUUID(), name, created_at: new Date().toISOString() }
  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()
  const { data, error } = await supabase
    .from('custom_roles')
    .upsert({ name }, { onConflict: 'name' })
    .select()
    .single()
  if (error) throw error
  return data as CustomRole
}

export async function deleteCustomRole(id: string): Promise<boolean> {
  if (isMockMode()) return true
  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()
  const { error } = await supabase.from('custom_roles').delete().eq('id', id)
  return !error
}
