'use client'

import type { TaskStatus } from '@/types/database'
import { STATUS_LABELS, STATUS_STYLES } from '@/lib/constants'

interface StatusChipProps {
  status: TaskStatus
  size?: 'sm' | 'md'
}

export function StatusChip({ status, size = 'md' }: StatusChipProps) {
  const style = STATUS_STYLES[status]
  const label = STATUS_LABELS[status]

  return (
    <span
      className={`
        ${style.bg} ${style.text} ${style.border}
        text-[10.5px] px-[9px] py-[2px] rounded-full font-semibold border
        inline-block whitespace-nowrap
        ${size === 'sm' ? 'text-[9px] px-[7px] py-[1px]' : ''}
      `}
    >
      {label}
    </span>
  )
}
