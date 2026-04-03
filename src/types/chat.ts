// =============================================================================
// Chat type definitions (Teams/Slack-style)
// =============================================================================

export type ChannelType = 'public' | 'private' | 'dm'
export type MessageType = 'text' | 'file' | 'system'
export type MemberRole = 'admin' | 'member'

export interface ChatChannel {
  id: string
  name: string
  description: string
  channel_type: ChannelType
  project_id: string | null
  created_by: string | null
  is_archived: boolean
  avatar_emoji: string
  created_at: string
  updated_at: string
  // Computed
  member_count?: number
  unread_count?: number
  last_message?: ChatMessage | null
  members?: ChatChannelMember[]
}

export interface ChatChannelMember {
  id: string
  channel_id: string
  user_id: string
  role: MemberRole
  last_read_at: string
  notifications_enabled: boolean
  joined_at: string
  user?: { id: string; name: string; name_short: string; avatar_color: string; avatar_url: string | null }
}

export interface ChatMessage {
  id: string
  channel_id: string
  user_id: string
  content: string
  message_type: MessageType
  thread_id: string | null
  reply_count: number
  file_url: string
  file_name: string
  file_size: number
  is_edited: boolean
  is_deleted: boolean
  mentions: string[]
  created_at: string
  updated_at: string
  // Relations
  user?: { id: string; name: string; name_short: string; avatar_color: string; avatar_url: string | null }
  reactions?: ChatReaction[]
}

export interface ChatReaction {
  id: string
  message_id: string
  user_id: string
  emoji: string
  created_at: string
  user?: { id: string; name: string }
}

// Grouped reactions for display
export interface ReactionGroup {
  emoji: string
  count: number
  users: string[]
  hasReacted: boolean // current user has reacted
}
