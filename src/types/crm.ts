// =============================================================================
// CRM type definitions
// =============================================================================

// ---------------------------------------------------------------------------
// Enums / Literal Types
// ---------------------------------------------------------------------------

export type CompanySize = '' | 'solo' | '1-10' | '11-50' | '51-200' | '201-1000' | '1001+'
export type LeadSource = '' | 'inbound' | 'outbound' | 'referral' | 'event' | 'website' | 'social' | 'other'
export type LifecycleStage = 'subscriber' | 'lead' | 'mql' | 'sql' | 'opportunity' | 'customer' | 'evangelist' | 'other'
export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'unqualified' | 'converted' | 'lost'
export type DealStage = 'proposal' | 'negotiation' | 'contract_sent' | 'won' | 'lost' | 'churned'
export type DealPriority = 'low' | 'medium' | 'high' | 'critical'
export type CrmActivityType = 'note' | 'call' | 'email' | 'meeting' | 'task' | 'stage_change' | 'status_change' | 'system'
export type CrmEntityType = 'contact' | 'company' | 'lead' | 'deal'

// ---------------------------------------------------------------------------
// Core Entities
// ---------------------------------------------------------------------------

export interface CrmCompany {
  id: string
  client_id: string | null
  name: string
  domain: string
  industry: string
  company_size: CompanySize
  phone: string
  website: string
  address: string
  description: string
  owner_id: string | null
  source: LeadSource
  tags: string[]
  custom_fields: Record<string, any>
  annual_revenue: number
  employee_count: number
  founded_year: number | null
  country: string
  city: string
  postal_code: string
  linkedin_url: string
  facebook_url: string
  twitter_handle: string
  parent_company_id: string | null
  company_type: string
  tier: string
  last_activity_date: string | null
  lifecycle_stage: string
  notes: string
  created_at: string
  updated_at: string
  owner?: { id: string; name: string; avatar_color: string } | null
  contacts_count?: number
  deals_count?: number
}

export interface CrmContact {
  id: string
  company_id: string | null
  first_name: string
  last_name: string
  email: string
  phone: string
  title: string
  department: string
  linkedin_url: string
  description: string
  owner_id: string | null
  lifecycle_stage: LifecycleStage
  lead_status: LeadStatus
  lead_score: number
  source: string
  last_contacted_at: string | null
  mobile_phone: string
  address: string
  date_of_birth: string | null
  preferred_language: string
  last_activity_date: string | null
  decision_maker: boolean
  source_channel: string
  source_detail: string
  first_touch_date: string | null
  first_touch_channel: string
  utm_source: string
  utm_medium: string
  utm_campaign: string
  email_opt_in: boolean
  line_opt_in: boolean
  line_user_id: string
  tags: string[]
  custom_fields: Record<string, any>
  created_at: string
  updated_at: string
  company?: { id: string; name: string } | null
  owner?: { id: string; name: string; avatar_color: string } | null
}

export interface CrmLead {
  id: string
  contact_id: string | null
  company_id: string | null
  title: string
  status: LeadStatus
  source: string
  estimated_value: number
  currency: string
  owner_id: string | null
  converted_deal_id: string | null
  converted_at: string | null
  expected_close_date: string | null
  description: string
  tags: string[]
  custom_fields: Record<string, any>
  sales_contribution: number
  created_at: string
  updated_at: string
  contact?: { id: string; first_name: string; last_name: string; email: string } | null
  company?: { id: string; name: string } | null
  owner?: { id: string; name: string; avatar_color: string } | null
}

export interface CrmDeal {
  id: string
  title: string
  company_id: string | null
  contact_id: string | null
  lead_id: string | null
  pipeline_opportunity_id: string | null
  project_id: string | null
  stage: DealStage
  amount: number
  currency: string
  probability: number
  expected_close_date: string | null
  actual_close_date: string | null
  owner_id: string | null
  loss_reason: string
  priority: DealPriority
  description: string
  tags: string[]
  custom_fields: Record<string, any>
  sales_contribution: number
  created_at: string
  updated_at: string
  company?: { id: string; name: string } | null
  contact?: { id: string; first_name: string; last_name: string; email: string } | null
  owner?: { id: string; name: string; avatar_color: string } | null
  items?: CrmDealItem[]
}

export interface CrmDealItem {
  id: string
  deal_id: string
  name: string
  description: string
  quantity: number
  unit_price: number
  discount_percent: number
  sort_order: number
  created_at: string
}

export interface CrmActivity {
  id: string
  entity_type: CrmEntityType
  entity_id: string
  activity_type: CrmActivityType
  subject: string
  body: string
  outcome: string
  scheduled_at: string | null
  completed_at: string | null
  duration_minutes: number | null
  is_completed: boolean
  user_id: string
  metadata: Record<string, any>
  created_at: string
  updated_at: string
  user?: { id: string; name: string; avatar_color: string } | null
}

// ---------------------------------------------------------------------------
// Filter Types
// ---------------------------------------------------------------------------

export interface CrmContactFilters {
  q?: string
  company_id?: string
  owner_id?: string
  lifecycle_stage?: LifecycleStage
  lead_status?: LeadStatus
  preferred_language?: string
  decision_maker?: boolean
  page?: number
  pageSize?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface CrmDealFilters {
  q?: string
  company_id?: string
  owner_id?: string
  stage?: DealStage | DealStage[]
  priority?: DealPriority
  page?: number
  pageSize?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface CrmLeadFilters {
  q?: string
  status?: LeadStatus
  owner_id?: string
  page?: number
  pageSize?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface CrmCompanyFilters {
  q?: string
  owner_id?: string
  company_type?: string
  tier?: string
  lifecycle_stage?: string
  page?: number
  pageSize?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

// ---------------------------------------------------------------------------
// Dashboard / KPI Types
// ---------------------------------------------------------------------------

export interface CrmDashboardData {
  dealsByStage: { stage: DealStage; count: number; total_amount: number }[]
  recentActivities: CrmActivity[]
  pipelineValue: number
  wonThisMonth: number
  avgDealSize: number
  conversionRate: number
  totalContacts: number
  totalLeads: number
  totalDeals: number
  avgSalesContribution: number
}
