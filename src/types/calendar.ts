// =============================================================================
// Microsoft 365 Calendar Integration types
// =============================================================================

export type EventSensitivity = 'normal' | 'personal' | 'private' | 'confidential'
export type ShowAs = 'free' | 'tentative' | 'busy' | 'oof' | 'workingElsewhere' | 'unknown'
export type ResponseStatus = '' | 'none' | 'organizer' | 'tentativelyAccepted' | 'accepted' | 'declined'

export interface CalendarEvent {
  id: string
  user_id: string
  ms_event_id: string
  subject: string
  start_at: string
  end_at: string
  duration_minutes: number
  is_all_day: boolean
  sensitivity: EventSensitivity
  show_as: ShowAs
  is_cancelled: boolean
  is_recurring: boolean
  organizer_name: string
  organizer_email: string
  location: string
  response_status: ResponseStatus
  synced_at: string
}

export interface MS365Connection {
  connected: boolean
  ms_user_id?: string
  connected_at?: string
  last_sync_at?: string
}

export interface CalendarWorkload {
  user_id: string
  user_name: string
  meeting_hours: number
  task_hours: number
  total_hours: number
  capacity_hours: number
  available_hours: number
  utilization_rate: number
}

export interface TimeSlot {
  start: string
  end: string
  duration_minutes: number
  available_members: string[]
  unavailable_members: string[]
  score: number // higher = better slot
}
