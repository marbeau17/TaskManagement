// =============================================================================
// Task Template type definitions
// =============================================================================

export interface TemplateField {
  key: string
  label: string
  type: 'text' | 'textarea' | 'select' | 'number' | 'url' | 'multiselect' | 'button_group'
  options?: string[]
  placeholder?: string
  required?: boolean
  multiSelect?: boolean  // for button_group — allow multiple selection
}

export interface TaskTemplate {
  id: string
  name: string
  category: string
  fields: TemplateField[]
  is_default: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

export type TemplateFormData = Record<string, string | number | string[]>
