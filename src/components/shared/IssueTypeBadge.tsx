'use client'

import type { IssueType } from '@/types/issue'

interface IssueTypeBadgeProps {
  type: IssueType
  size?: 'sm' | 'md'
}

const TYPE_CONFIG: Record<IssueType, { icon: string; label: string; bg: string; text: string; border: string }> = {
  bug: {
    icon: '\uD83D\uDC1B',
    label: '\u30D0\u30B0',
    bg: 'bg-red-50 dark:bg-red-950/30',
    text: 'text-red-600 dark:text-red-400',
    border: 'border-red-200 dark:border-red-800',
  },
  improvement: {
    icon: '\uD83D\uDCA1',
    label: '\u6539\u5584',
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    text: 'text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-200 dark:border-emerald-800',
  },
  question: {
    icon: '\u2753',
    label: '\u8CEA\u554F',
    bg: 'bg-blue-50 dark:bg-blue-950/30',
    text: 'text-blue-600 dark:text-blue-400',
    border: 'border-blue-200 dark:border-blue-800',
  },
  incident: {
    icon: '\uD83D\uDD25',
    label: '\u30A4\u30F3\u30B7\u30C7\u30F3\u30C8',
    bg: 'bg-orange-50 dark:bg-orange-950/30',
    text: 'text-orange-600 dark:text-orange-400',
    border: 'border-orange-200 dark:border-orange-800',
  },
}

export function IssueTypeBadge({ type, size = 'md' }: IssueTypeBadgeProps) {
  const config = TYPE_CONFIG[type]

  return (
    <span
      className={`
        ${config.bg} ${config.text} ${config.border}
        text-[10.5px] px-[9px] py-[2px] rounded-full font-semibold border
        inline-flex items-center gap-[3px] whitespace-nowrap
        ${size === 'sm' ? 'text-[9px] px-[7px] py-[1px]' : ''}
      `}
    >
      <span>{config.icon}</span>
      {config.label}
    </span>
  )
}
