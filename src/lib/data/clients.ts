// =============================================================================
// Data abstraction layer – Clients
// =============================================================================

import type { Client } from '@/types/database'
import { useMock } from '@/lib/utils'

// ---------------------------------------------------------------------------
// getClients
// ---------------------------------------------------------------------------

export async function getClients(): Promise<Client[]> {
  if (useMock()) {
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

export async function searchClients(query: string): Promise<Client[]> {
  if (useMock()) {
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
