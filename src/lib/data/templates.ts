// =============================================================================
// Data abstraction layer – Templates
// Switches between mock handlers and Supabase depending on Supabase URL config
// =============================================================================

import { isMockMode } from '@/lib/utils'
import type { TaskTemplate, TemplateField } from '@/types/template'

// ---------------------------------------------------------------------------
// getTemplates
// ---------------------------------------------------------------------------

export async function getTemplates(): Promise<TaskTemplate[]> {
  if (isMockMode()) {
    const { getMockTemplates } = await import('@/lib/mock/handlers')
    return getMockTemplates()
  }

  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()

  const { data, error } = await supabase
    .from('task_templates')
    .select('*')
    .order('name', { ascending: true })

  if (error) throw error

  return (data ?? []).map((row: any) => ({
    ...row,
    fields: (typeof row.fields === 'string' ? JSON.parse(row.fields) : row.fields) as TemplateField[],
  })) as TaskTemplate[]
}

// ---------------------------------------------------------------------------
// getTemplateById
// ---------------------------------------------------------------------------

export async function getTemplateById(id: string): Promise<TaskTemplate | null> {
  if (isMockMode()) {
    const { getMockTemplateById } = await import('@/lib/mock/handlers')
    return getMockTemplateById(id)
  }

  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()

  const { data, error } = await supabase
    .from('task_templates')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null // not found
    throw error
  }

  return {
    ...data,
    fields: (typeof data.fields === 'string' ? JSON.parse(data.fields) : data.fields) as TemplateField[],
  } as TaskTemplate
}

// ---------------------------------------------------------------------------
// createTemplate
// ---------------------------------------------------------------------------

export async function createTemplate(data: {
  name: string
  category: string
  fields: TemplateField[]
}): Promise<TaskTemplate> {
  if (isMockMode()) {
    const { createMockTemplate } = await import('@/lib/mock/handlers')
    return createMockTemplate(data)
  }

  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  const { data: created, error } = await supabase
    .from('task_templates')
    .insert({
      name: data.name,
      category: data.category,
      fields: data.fields as any,
      is_default: false,
      created_by: authUser?.id ?? null,
    })
    .select()
    .single()

  if (error) throw error

  return {
    ...created,
    fields: (typeof created.fields === 'string' ? JSON.parse(created.fields) : created.fields) as TemplateField[],
  } as TaskTemplate
}

// ---------------------------------------------------------------------------
// updateTemplate
// ---------------------------------------------------------------------------

export async function updateTemplate(
  id: string,
  data: Partial<TaskTemplate>
): Promise<TaskTemplate> {
  if (isMockMode()) {
    const { updateMockTemplate } = await import('@/lib/mock/handlers')
    return updateMockTemplate(id, data)
  }

  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()

  // Only allow updating specific fields
  const updatePayload: Record<string, any> = {}
  if (data.name !== undefined) updatePayload.name = data.name
  if (data.category !== undefined) updatePayload.category = data.category
  if (data.fields !== undefined) updatePayload.fields = data.fields as any

  const { data: updated, error } = await supabase
    .from('task_templates')
    .update(updatePayload)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error

  return {
    ...updated,
    fields: (typeof updated.fields === 'string' ? JSON.parse(updated.fields) : updated.fields) as TemplateField[],
  } as TaskTemplate
}

// ---------------------------------------------------------------------------
// deleteTemplate
// ---------------------------------------------------------------------------

export async function deleteTemplate(id: string): Promise<boolean> {
  if (isMockMode()) {
    const { deleteMockTemplate } = await import('@/lib/mock/handlers')
    return deleteMockTemplate(id)
  }

  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()

  const { error } = await supabase
    .from('task_templates')
    .delete()
    .eq('id', id)

  if (error) throw error
  return true
}
