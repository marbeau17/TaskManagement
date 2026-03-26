'use client'

import type { IssueSeverity } from '@/types/issue'

interface SeverityBadgeProps {
  severity: IssueSeverity
  size?: 'sm' | 'md'
}

const SEVERITY_CONFIG: Record<IssueSeverity, { label: string; bg: string; text: string; border: string }> = {
  critical: {
    label: 'Critical',
    bg: 'bg-red-100 dark:bg-red-950/40',
    text: 'text-red-700 dark:text-red-400',
    border: 'border-red-300 dark:border-red-800',
  },
  high: {
    label: 'High',
    bg: 'bg-orange-100 dark:bg-orange-950/40',
    text: 'text-orange-700 dark:text-orange-400',
    border: 'border-orange-300 dark:border-orange-800',
  },
  medium: {
    label: 'Medium',
    bg: 'bg-yellow-100 dark:bg-yellow-950/40',
    text: 'text-yellow-700 dark:text-yellow-400',
    border: 'border-yellow-300 dark:border-yellow-800',
  },
  low: {
    label: 'Low',
    bg: 'bg-blue-100 dark:bg-blue-950/40',
    text: 'text-blue-700 dark:text-blue-400',
    border: 'border-blue-300 dark:border-blue-800',
  },
}

export function SeverityBadge({ severity, size = 'md' }: SeverityBadgeProps) {
  const config = SEVERITY_CONFIG[severity]

  return (
    <span
      className={`
        ${config.bg} ${config.text} ${config.border}
        text-[10.5px] px-[9px] py-[2px] rounded-full font-semibold border
        inline-block whitespace-nowrap
        ${size === 'sm' ? 'text-[9px] px-[7px] py-[1px]' : ''}
      `}
    >
      {config.label}
    </span>
  )
}
