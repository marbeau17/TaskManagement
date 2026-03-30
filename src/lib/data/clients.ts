// =============================================================================
// Data abstraction layer – Clients
// =============================================================================

import type { Client } from '@/types/database'
import { isMockMode } from '@/lib/utils'

// ---------------------------------------------------------------------------
// getClients
// ---------------------------------------------------------------------------

export async function getClients(): Promise<Client[]> {
  if (isMockMode()) {
    const { getMockClients } = await import('@/lib/mock/handlers')
    return getMockClients()
  }

  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()

  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .order('name', { ascending: true })

  if (error) throw error
  return (data ?? []) as Client[]
}

// ---------------------------------------------------------------------------
// searchClients
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// createClient
// ---------------------------------------------------------------------------

export async function createClient(name: string): Promise<Client> {
  if (isMockMode()) {
    const { createMockClient } = await import('@/lib/mock/handlers')
    return createMockClient(name)
  }

  const { createClient: createSupabaseClient } = await import('@/lib/supabase/client')
  const supabase = createSupabaseClient()

  const { data, error } = await supabase
    .from('clients')
    .insert({ name })
    .select()
    .single()

  if (error) throw error
  return data as Client
}

// ---------------------------------------------------------------------------
// updateClient
// ---------------------------------------------------------------------------

export async function updateClient(id: string, name: string): Promise<Client> {
  if (isMockMode()) {
    const { updateMockClient } = await import('@/lib/mock/handlers')
    return updateMockClient(id, name)
  }

  const { createClient: createSupabaseClient } = await import('@/lib/supabase/client')
  const supabase = createSupabaseClient()

  const { data, error } = await supabase
    .from('clients')
    .update({ name })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as Client
}

// ---------------------------------------------------------------------------
// deleteClient
// ---------------------------------------------------------------------------

export async function deleteClient(id: string): Promise<boolean> {
  if (isMockMode()) {
    const { deleteMockClient } = await import('@/lib/mock/handlers')
    return deleteMockClient(id)
  }

  const res = await fetch('/api/clients/delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientId: id }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || 'Delete failed')
  }
  return true
}

// ---------------------------------------------------------------------------
// searchClients
// ---------------------------------------------------------------------------

export async function searchClients(query: string): Promise<Client[]> {
  if (isMockMode()) {
    const { searchMockClients } = await import('@/lib/mock/handlers')
    return searchMockClients(query)
  }

  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()

  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .ilike('name', `%${query}%`)
    .order('name', { ascending: true })
    .limit(20)

  if (error) throw error
  return (data ?? []) as Client[]
}
