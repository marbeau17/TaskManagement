// =============================================================================
// Data abstraction layer – Custom Fields (REQ-06)
// =============================================================================

import type {
  CustomFieldDefinition,
  CustomFieldValue,
  CreateCustomFieldDefinition,
  UpdateCustomFieldDefinition,
} from '@/types/database'

// ---------------------------------------------------------------------------
// Field definitions CRUD
// ---------------------------------------------------------------------------

export async function getFieldDefinitions(
  projectId: string
): Promise<CustomFieldDefinition[]> {
  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('custom_field_definitions')
    .select('*')
    .eq('project_id', projectId)
    .order('sort_order', { ascending: true })

  if (error) { console.warn("[Data]", error.message); return undefined as any }
  return (data ?? []) as CustomFieldDefinition[]
}

export async function createFieldDefinition(
  input: CreateCustomFieldDefinition
): Promise<CustomFieldDefinition> {
  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('custom_field_definitions')
    .insert({
      project_id: input.project_id,
      name: input.name,
      field_type: input.field_type,
      options: input.options ?? [],
      required: input.required ?? false,
      sort_order: input.sort_order ?? 0,
    })
    .select('*')
    .single()

  if (error) { console.warn("[Data]", error.message); return undefined as any }
  return data as CustomFieldDefinition
}

export async function updateFieldDefinition(
  id: string,
  input: UpdateCustomFieldDefinition
): Promise<CustomFieldDefinition> {
  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('custom_field_definitions')
    .update(input)
    .eq('id', id)
    .select('*')
    .single()

  if (error) { console.warn("[Data]", error.message); return undefined as any }
  return data as CustomFieldDefinition
}

export async function deleteFieldDefinition(id: string): Promise<void> {
  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('custom_field_definitions')
    .delete()
    .eq('id', id)

  if (error) { console.warn("[Data]", error.message); return undefined as any }
}

export async function reorderFieldDefinitions(
  orderedIds: string[]
): Promise<void> {
  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()

  // Update sort_order for each definition
  const updates = orderedIds.map((id, index) =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from('custom_field_definitions')
      .update({ sort_order: index })
      .eq('id', id)
  )

  const results = await Promise.all(updates)
  const firstError = results.find((r) => r.error)
  if (firstError?.error) throw firstError.error
}

// ---------------------------------------------------------------------------
// Field values CRUD
// ---------------------------------------------------------------------------

export async function getFieldValues(
  entityType: 'issue' | 'task',
  entityId: string
): Promise<CustomFieldValue[]> {
  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('custom_field_values')
    .select('*, definition:custom_field_definitions!field_id(*)')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)

  if (error) { console.warn("[Data]", error.message); return undefined as any }
  return (data ?? []) as CustomFieldValue[]
}

export async function upsertFieldValue(
  entityType: 'issue' | 'task',
  entityId: string,
  fieldId: string,
  value: unknown
): Promise<CustomFieldValue> {
  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('custom_field_values')
    .upsert(
      {
        entity_type: entityType,
        entity_id: entityId,
        field_id: fieldId,
        value,
      },
      { onConflict: 'entity_type,entity_id,field_id' }
    )
    .select('*, definition:custom_field_definitions!field_id(*)')
    .single()

  if (error) { console.warn("[Data]", error.message); return undefined as any }
  return data as CustomFieldValue
}

export async function deleteFieldValue(id: string): Promise<void> {
  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('custom_field_values')
    .delete()
    .eq('id', id)

  if (error) { console.warn("[Data]", error.message); return undefined as any }
}

export async function bulkUpsertFieldValues(
  entityType: 'issue' | 'task',
  entityId: string,
  values: Record<string, unknown> // fieldId -> value
): Promise<CustomFieldValue[]> {
  const results: CustomFieldValue[] = []
  for (const [fieldId, value] of Object.entries(values)) {
    const result = await upsertFieldValue(entityType, entityId, fieldId, value)
    results.push(result)
  }
  return results
}
