// =============================================================================
// Member management types
// =============================================================================

import type { UserRole } from './database'

/** Filters applied to the member list view */
export interface MemberFilters {
  search?: string
  role?: string
  is_active?: boolean
}

/** Form data for inviting a new member */
export interface InviteMemberForm {
  email: string
  name: string
  name_short: string
  role: UserRole
  weekly_capacity_hours: number
}

/** Form data for changing a password */
export interface ChangePasswordForm {
  current_password: string
  new_password: string
  confirm_password: string
}
