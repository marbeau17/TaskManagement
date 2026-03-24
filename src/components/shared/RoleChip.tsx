'use client'

import type { UserRole } from '@/types/database'
import { ROLE_LABELS, ROLE_STYLES } from '@/lib/constants'

interface RoleChipProps {
  role: UserRole
}

export function RoleChip({ role }: RoleChipProps) {
  const style = ROLE_STYLES[role]
  const label = ROLE_LABELS[role]

  return (
    <span
      className={`
        ${style.bg} ${style.text} ${style.border}
        text-[9.5px] px-[7px] py-[1px] rounded-full font-bold border
        inline-block
      `}
    >
      {label}
    </span>
  )
}
