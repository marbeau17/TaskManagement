// =============================================================================
// Data abstraction layer – Assets
// Mock in-memory store + Supabase, following backlog.ts pattern
// =============================================================================

import type { Asset, AssetCategory, AssetStatus } from '@/types/database'
import { isMockMode } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Mock in-memory store
// ---------------------------------------------------------------------------

let mockAssets: Asset[] = []
let mockIdCounter = 1

// ---------------------------------------------------------------------------
// listAssets
// ---------------------------------------------------------------------------

export async function listAssets(): Promise<Asset[]> {
  if (isMockMode()) {
    const { mockUsers } = await import('@/lib/mock/data')
    return mockAssets
      .map((a) => ({
        ...a,
        owner: a.owner_user_id ? mockUsers.find((u) => u.id === a.owner_user_id) ?? null : null,
      }))
      .sort((a, b) => {
        // seq_no asc NULLS LAST, then created_at desc
        if (a.seq_no == null && b.seq_no == null) {
          return a.created_at < b.created_at ? 1 : -1
        }
        if (a.seq_no == null) return 1
        if (b.seq_no == null) return -1
        if (a.seq_no !== b.seq_no) return a.seq_no - b.seq_no
        return a.created_at < b.created_at ? 1 : -1
      })
  }

  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()

  const { data, error } = await supabase
    .from('assets')
    .select('*, owner:users!assets_owner_user_id_fkey(*)')
    .order('seq_no', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as Asset[]
}

// ---------------------------------------------------------------------------
// createAsset
// ---------------------------------------------------------------------------

export interface CreateAssetInput {
  name: string
  seq_no?: number | null
  acquired_date?: string | null
  acquired_price?: number | null
  management_id?: string | null
  owner_name?: string | null
  owner_user_id?: string | null
  category?: AssetCategory
  status?: AssetStatus
  serial_number?: string | null
  location?: string | null
  notes?: string | null
}

export async function createAsset(input: CreateAssetInput): Promise<Asset> {
  if (isMockMode()) {
    const now = new Date().toISOString()
    const asset: Asset = {
      id: `mock-asset-${mockIdCounter++}`,
      seq_no: input.seq_no ?? null,
      name: input.name,
      acquired_date: input.acquired_date ?? null,
      acquired_price: input.acquired_price ?? null,
      management_id: input.management_id ?? null,
      owner_name: input.owner_name ?? null,
      owner_user_id: input.owner_user_id ?? null,
      category: input.category ?? 'other',
      status: input.status ?? 'in_use',
      serial_number: input.serial_number ?? null,
      location: input.location ?? null,
      notes: input.notes ?? null,
      created_at: now,
      updated_at: now,
    }
    mockAssets.push(asset)
    return asset
  }

  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()

  const { data, error } = await supabase
    .from('assets')
    .insert({
      name: input.name,
      seq_no: input.seq_no ?? null,
      acquired_date: input.acquired_date ?? null,
      acquired_price: input.acquired_price ?? null,
      management_id: input.management_id ?? null,
      owner_name: input.owner_name ?? null,
      owner_user_id: input.owner_user_id ?? null,
      category: input.category ?? 'other',
      status: input.status ?? 'in_use',
      serial_number: input.serial_number ?? null,
      location: input.location ?? null,
      notes: input.notes ?? null,
    })
    .select('*, owner:users!assets_owner_user_id_fkey(*)')
    .single()

  if (error) throw error
  return data as Asset
}

// ---------------------------------------------------------------------------
// updateAsset
// ---------------------------------------------------------------------------

export type UpdateAssetInput = Partial<CreateAssetInput>

export async function updateAsset(id: string, patch: UpdateAssetInput): Promise<Asset> {
  if (isMockMode()) {
    const idx = mockAssets.findIndex((a) => a.id === id)
    if (idx < 0) throw new Error('Asset not found')
    mockAssets[idx] = { ...mockAssets[idx], ...patch, updated_at: new Date().toISOString() }
    return mockAssets[idx]
  }

  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('assets')
    .update(patch)
    .eq('id', id)
    .select('*, owner:users!assets_owner_user_id_fkey(*)')
    .single()

  if (error) throw error
  return data as Asset
}

// ---------------------------------------------------------------------------
// deleteAsset
// ---------------------------------------------------------------------------

export async function deleteAsset(id: string): Promise<void> {
  if (isMockMode()) {
    mockAssets = mockAssets.filter((a) => a.id !== id)
    return
  }

  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()

  const { error } = await supabase.from('assets').delete().eq('id', id)
  if (error) throw error
}

// ---------------------------------------------------------------------------
// bulkCreateAssets
// ---------------------------------------------------------------------------

export async function bulkCreateAssets(inputs: CreateAssetInput[]): Promise<Asset[]> {
  if (inputs.length === 0) return []

  if (isMockMode()) {
    const now = new Date().toISOString()
    const created: Asset[] = inputs.map((input) => ({
      id: `mock-asset-${mockIdCounter++}`,
      seq_no: input.seq_no ?? null,
      name: input.name,
      acquired_date: input.acquired_date ?? null,
      acquired_price: input.acquired_price ?? null,
      management_id: input.management_id ?? null,
      owner_name: input.owner_name ?? null,
      owner_user_id: input.owner_user_id ?? null,
      category: input.category ?? 'other',
      status: input.status ?? 'in_use',
      serial_number: input.serial_number ?? null,
      location: input.location ?? null,
      notes: input.notes ?? null,
      created_at: now,
      updated_at: now,
    }))
    mockAssets.push(...created)
    return created
  }

  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()

  const rows = inputs.map((input) => ({
    name: input.name,
    seq_no: input.seq_no ?? null,
    acquired_date: input.acquired_date ?? null,
    acquired_price: input.acquired_price ?? null,
    management_id: input.management_id ?? null,
    owner_name: input.owner_name ?? null,
    owner_user_id: input.owner_user_id ?? null,
    category: input.category ?? 'other',
    status: input.status ?? 'in_use',
    serial_number: input.serial_number ?? null,
    location: input.location ?? null,
    notes: input.notes ?? null,
  }))

  const { data, error } = await supabase
    .from('assets')
    .insert(rows)
    .select('*, owner:users!assets_owner_user_id_fkey(*)')

  if (error) throw error
  return (data ?? []) as Asset[]
}
