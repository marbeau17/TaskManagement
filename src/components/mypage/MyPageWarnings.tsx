'use client'

import Link from 'next/link'
import { AlertTriangle, Clock, TrendingUp, Pause, Bug, CheckCircle } from 'lucide-react'
import { useI18n } from '@/hooks/useI18n'
import type { MyPageWarning } from '@/types/mypage'

interface Props {
  warnings: MyPageWarning[]
  isLoading?: boolean
}

const SEVERITY_STYLES = {
  critical: 'border-l-4 border-l-red-500 bg-red-50 dark:bg-red-500/10',
  warning: 'border-l-4 border-l-amber-500 bg-amber-50 dark:bg-amber-500/10',
  caution: 'border-l-4 border-l-orange-400 bg-orange-50 dark:bg-orange-400/10',
} as const

const TYPE_ICONS = {
  overdue: AlertTriangle,
  deadline_soon: Clock,
  overloaded: TrendingUp,
  stale_task: Pause,
  critical_issue: Bug,
} as const

const SEVERITY_DOT = {
  critical: 'bg-red-500',
  warning: 'bg-amber-500',
  caution: 'bg-orange-400',
} as const

function getWarningDescription(w: MyPageWarning, t: (key: string) => string): string {
  switch (w.type) {
    case 'overdue':
      return t('mypage.warnings.overdue').replace('{days}', String(w.days ?? 0)).replace('{deadline}', w.deadline ?? '')
    case 'deadline_soon':
      return w.days === 0
        ? t('mypage.warnings.deadlineToday')
        : t('mypage.warnings.deadlineSoon').replace('{days}', String(w.days ?? 0)).replace('{deadline}', w.deadline ?? '')
    case 'overloaded':
      return t('mypage.warnings.overloadedRate').replace('{rate}', String(w.rate ?? 0))
    case 'stale_task':
      return t('mypage.warnings.staleTask').replace('{days}', String(w.days ?? 0))
    case 'critical_issue':
      return w.description // Keep server-generated for issues (already bilingual)
    default:
      return w.description
  }
}

export function MyPageWarnings({ warnings, isLoading }: Props) {
  const { t } = useI18n()

  if (isLoading) {
    return (
      <div className="bg-surface border border-border2 rounded-[10px] shadow overflow-hidden">
        <div className="px-[12px] py-[10px] border-b border-border2 bg-surf2">
          <h3 className="text-[13px] font-bold text-text">{t('mypage.warnings.title')}</h3>
        </div>
        <div className="p-[16px] animate-pulse">
          <div className="h-[14px] bg-surf2 rounded w-3/4 mb-[8px]" />
          <div className="h-[14px] bg-surf2 rounded w-1/2" />
        </div>
      </div>
    )
  }

  if (warnings.length === 0) {
    return (
      <div className="bg-surface border border-border2 rounded-[10px] shadow overflow-hidden">
        <div className="px-[12px] py-[10px] border-b border-border2 bg-surf2">
          <h3 className="text-[13px] font-bold text-text">{t('mypage.warnings.title')}</h3>
        </div>
        <div className="flex items-center gap-[8px] px-[16px] py-[14px] border-l-4 border-l-emerald-500 bg-emerald-50 dark:bg-emerald-500/10">
          <CheckCircle className="w-[16px] h-[16px] text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="text-[12px] text-emerald-700 dark:text-emerald-300 font-medium">
            {t('mypage.warnings.none')}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div data-testid="mypage-warnings" className="bg-surface border border-border2 rounded-[10px] shadow overflow-hidden">
      <div className="px-[12px] py-[10px] border-b border-border2 bg-surf2 flex items-center gap-[6px]">
        <h3 className="text-[13px] font-bold text-text">{t('mypage.warnings.title')}</h3>
        <span className="text-[10px] bg-danger-bg text-danger px-[6px] py-[1px] rounded-full font-bold border border-danger-b">
          {warnings.length}
        </span>
      </div>
      <div className="flex flex-col">
        {warnings.map((w) => {
          const Icon = TYPE_ICONS[w.type] ?? AlertTriangle
          return (
            <Link
              key={w.id}
              href={w.link}
              className="flex items-center gap-[10px] px-[14px] py-[10px] border-b border-border2 last:border-b-0 no-underline transition-colors hover:bg-surf2"
            >
              <div className={`${SEVERITY_STYLES[w.severity]} flex items-center gap-[10px] flex-1 -my-[10px] -ml-[14px] py-[10px] pl-[14px]`}>
                <div className={`w-[6px] h-[6px] rounded-full shrink-0 ${SEVERITY_DOT[w.severity]}`} />
                <Icon className="w-[14px] h-[14px] shrink-0 text-text" />
                <div className="flex-1 min-w-0">
                  <span className="text-[12px] font-semibold text-text truncate block">{w.title}</span>
                  <span className="text-[11px] text-text2 dark:text-text/70">{getWarningDescription(w, t)}</span>
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
