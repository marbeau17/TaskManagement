// =============================================================================
// CRM Form Builder type definitions (HubSpot-style)
// =============================================================================

export type FormFieldType = 'text' | 'email' | 'phone' | 'textarea' | 'select' | 'checkbox' | 'number' | 'date' | 'hidden'

export interface FormField {
  id: string
  label: string
  type: FormFieldType
  name: string                    // field key (maps to CRM contact field or custom)
  required: boolean
  placeholder?: string
  options?: string[]              // for select type
  defaultValue?: string
  crmMapping?: string             // maps to crm_contacts field (e.g., 'first_name', 'email')
  width?: 'full' | 'half'        // layout
}

export interface FormSettings {
  thankYouMessage: string
  redirectUrl?: string
  notificationEmail?: string      // send notification on submission
  createContact: boolean          // auto-create CRM contact
  assignOwnerId?: string          // auto-assign contact owner
  submitButtonText: string
  formColor?: string              // primary color for the embed
}

export interface CrmForm {
  id: string
  name: string
  description: string
  fields: FormField[]
  settings: FormSettings
  status: 'active' | 'inactive' | 'archived'
  submit_count: number
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface CrmFormSubmission {
  id: string
  form_id: string
  contact_id: string | null
  data: Record<string, any>
  source_url: string
  ip_address: string
  user_agent: string
  utm_source: string
  utm_medium: string
  utm_campaign: string
  status: 'new' | 'contacted' | 'qualified' | 'spam'
  created_at: string
  // Relations
  form?: Pick<CrmForm, 'id' | 'name'>
  contact?: { id: string; first_name: string; last_name: string; email: string } | null
}
