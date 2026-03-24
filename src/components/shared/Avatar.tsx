'use client'

import type { AvatarColor } from '@/types/database'
import { AVATAR_COLORS } from '@/lib/constants'

interface AvatarProps {
  name_short: string
  color: AvatarColor
  size?: 'sm' | 'md' | 'lg'
}

const SIZES = {
  sm: { box: 24, font: 9 },
  md: { box: 30, font: 11 },
  lg: { box: 38, font: 13 },
} as const

export function Avatar({ name_short, color, size = 'md' }: AvatarProps) {
  const colors = AVATAR_COLORS[color]
  const s = SIZES[size]

  return (
    <div
      className="rounded-full flex items-center justify-center shrink-0 font-bold select-none"
      style={{
        width: s.box,
        height: s.box,
        fontSize: s.font,
        backgroundColor: colors.bg,
        color: colors.text,
      }}
    >
      {name_short.charAt(0)}
    </div>
  )
}
