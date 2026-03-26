'use client'

import { useMemo } from 'react'
import { useMembers } from '@/hooks/useMembers'
import { parseMentionSegments } from '@/lib/mention-utils'

interface MentionTextProps {
  text: string
  className?: string
}

/**
 * Renders text with @mentions highlighted.
 * Valid mentions (matching a real member) are shown as styled badges.
 */
export function MentionText({ text, className = '' }: MentionTextProps) {
  const { data: members } = useMembers()

  const segments = useMemo(
    () => parseMentionSegments(text, members ?? []),
    [text, members]
  )

  return (
    <span className={className}>
      {segments.map((seg, i) =>
        seg.type === 'mention' ? (
          <span
            key={i}
            className="inline-block bg-mint-ll text-mint-d font-semibold rounded px-1 mx-[1px]"
            title={seg.value}
          >
            {seg.value}
          </span>
        ) : (
          <span key={i}>{seg.value}</span>
        )
      )}
    </span>
  )
}
