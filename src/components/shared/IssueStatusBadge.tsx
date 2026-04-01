'use client'

import type { IssueStatus } from '@/types/issue'

interface IssueStatusBadgeProps {
  status: IssueStatus
  size?: 'sm' | 'md'
}

const STATUS_CONFIG: Record<IssueStatus, { label: string; bg: string; text: string; border: string }> = {
  open: {
    label: '\u30AA\u30FC\u30D7\u30F3',
    bg: 'bg-slate-100 dark:bg-slate-800',
    text: 'text-slate-600 dark:text-slate-300',
    border: 'border-slate-300 dark:border-slate-600',
  },
  in_progress: {
    label: '\u5BFE\u5FDC\u4E2D',
    bg: 'bg-blue-100 dark:bg-blue-950/40',
    text: 'text-blue-700 dark:text-blue-400',
    border: 'border-blue-300 dark:border-blue-800',
  },
  resolved: {
    label: '\u89E3\u6C7A\u6E08',
    bg: 'bg-emerald-100 dark:bg-emerald-950/40',
    text: 'text-emerald-700 dark:text-emerald-400',
    border: 'border-emerald-300 dark:border-emerald-800',
  },
  verified: {
    label: '\u691C\u8A3C\u6E08',
    bg: 'bg-purple-100 dark:bg-purple-950/40',
    text: 'text-purple-700 dark:text-purple-400',
    border: 'border-purple-300 dark:border-purple-800',
  },
  closed: {
    label: '\u30AF\u30ED\u30FC\u30BA',
    bg: 'bg-gray-200 dark:bg-gray-800',
    text: 'text-gray-700 dark:text-gray-300',
    border: 'border-gray-400 dark:border-gray-600',
  },
  not_a_bug: {
    label: '問題なし',
    bg: 'bg-orange-100 dark:bg-orange-950/40',
    text: 'text-orange-700 dark:text-orange-400',
    border: 'border-orange-300 dark:border-orange-800',
  },
  duplicate: {
    label: '重複',
    bg: 'bg-gray-100 dark:bg-gray-800/60',
    text: 'text-gray-500 dark:text-gray-400',
    border: 'border-gray-300 dark:border-gray-600',
  },
  deferred: {
    label: '対応保留',
    bg: 'bg-cyan-100 dark:bg-cyan-950/40',
    text: 'text-cyan-700 dark:text-cyan-400',
    border: 'border-cyan-300 dark:border-cyan-800',
  },
}

export function IssueStatusBadge({ status, size = 'md' }: IssueStatusBadgeProps) {
  const config = STATUS_CONFIG[status]

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
