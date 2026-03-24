'use client'

import { getRoleLabel, getRoleStyle } from '@/lib/constants'

interface RoleChipProps {
  role: string
}

export function RoleChip({ role }: RoleChipProps) {
  const style = getRoleStyle(role)
  const label = getRoleLabel(role)

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
