import type { User } from '@/types/database'

/**
 * Regex to match @mentions in text.
 * Matches @name_short patterns (alphanumeric + underscore + Japanese chars).
 */
const MENTION_REGEX = /(@[\w\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]+)/g

/**
 * Extract mentioned user IDs from comment text by matching @name_short against
 * the provided members list.
 */
export function parseMentions(text: string, members: User[]): string[] {
  const matches = text.match(MENTION_REGEX)
  if (!matches) return []

  const ids: string[] = []
  for (const match of matches) {
    const nameShort = match.slice(1) // remove "@"
    const member = members.find((m) => m.name_short === nameShort)
    if (member && !ids.includes(member.id)) {
      ids.push(member.id)
    }
  }
  return ids
}

/**
 * Split comment text into segments: plain text and highlighted @mention spans.
 * Returns an array of { type, value, userId? } objects for rendering.
 */
export interface MentionSegment {
  type: 'text' | 'mention'
  value: string
  userId?: string
}

export function parseMentionSegments(
  text: string,
  members: User[]
): MentionSegment[] {
  const segments: MentionSegment[] = []
  let lastIndex = 0

  const regex = new RegExp(MENTION_REGEX.source, 'g')
  let match: RegExpExecArray | null

  while ((match = regex.exec(text)) !== null) {
    // Add plain text before this match
    if (match.index > lastIndex) {
      segments.push({ type: 'text', value: text.slice(lastIndex, match.index) })
    }

    const nameShort = match[1].slice(1)
    const member = members.find((m) => m.name_short === nameShort)

    if (member) {
      segments.push({
        type: 'mention',
        value: match[1],
        userId: member.id,
      })
    } else {
      // Not a real member, treat as plain text
      segments.push({ type: 'text', value: match[1] })
    }

    lastIndex = match.index + match[0].length
  }

  // Remaining text
  if (lastIndex < text.length) {
    segments.push({ type: 'text', value: text.slice(lastIndex) })
  }

  return segments
}
