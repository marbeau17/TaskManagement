// =============================================================================
// CRM Marketing Automation type definitions
// =============================================================================

export type CampaignType = 'email' | 'line' | 'instagram' | 'multi'
export type CampaignStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'cancelled'
export type RecipientStatus = 'pending' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'unsubscribed'
export type SourceChannel = '' | 'web_form' | 'line' | 'instagram' | 'referral' | 'cold_call' | 'event' | 'advertisement' | 'organic' | 'other'

export interface CrmCampaign {
  id: string
  name: string
  description: string
  campaign_type: CampaignType
  status: CampaignStatus
  subject: string
  content: {
    email_html?: string
    email_text?: string
    line_message?: string
    line_flex?: Record<string, any>
    instagram_caption?: string
  }
  target_segment: SegmentFilter
  target_count: number
  sent_count: number
  open_count: number
  click_count: number
  bounce_count: number
  unsubscribe_count: number
  scheduled_at: string | null
  sent_at: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface CrmCampaignRecipient {
  id: string
  campaign_id: string
  contact_id: string
  channel: string
  status: RecipientStatus
  sent_at: string | null
  opened_at: string | null
  clicked_at: string | null
  contact?: { id: string; first_name: string; last_name: string; email: string }
}

export interface CrmSegment {
  id: string
  name: string
  description: string
  filters: SegmentFilter
  contact_count: number
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface SegmentFilter {
  lifecycle_stage?: string[]
  lead_score_min?: number
  lead_score_max?: number
  source_channel?: string[]
  decision_maker?: boolean
  preferred_language?: string
  tags?: string[]
  email_opt_in?: boolean
  line_opt_in?: boolean
}

export interface CampaignStats {
  total_sent: number
  delivered: number
  opened: number
  clicked: number
  bounced: number
  unsubscribed: number
  open_rate: number
  click_rate: number
  bounce_rate: number
}
