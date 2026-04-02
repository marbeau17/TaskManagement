'use client'

import Link from 'next/link'
import { SeverityBadge, IssueStatusBadge } from '@/components/shared'
import { useI18n } from '@/hooks/useI18n'
import { differenceInCalendarDays } from 'date-fns'
import type { Issue } from '@/types/issue'

interface Props {
  issues: Issue[]
}

export function MyIssues({ issues }: Props) {
  const { t } = useI18n()

  return (
    <div className="bg-surface border border-border2 rounded-[10px] shadow overflow-hidden">
      <div className="px-[12px] py-[10px] border-b border-border2 bg-surf2 flex items-center justify-between">
        <h3 className="text-[13px] font-bold text-text">{t('mypage.issues.title')}</h3>
        {issues.length > 0 && (
          <span className="text-[10px] bg-mint-dd/10 text-mint-dd px-[6px] py-[1px] rounded-full font-bold">
            {issues.length}
          </span>
        )}
      </div>

      {issues.length === 0 ? (
        <div className="px-[12px] py-[16px] text-[12px] text-text3 text-center">
          {t('mypage.issues.empty')}
        </div>
      ) : (
        <div className="max-h-[300px] overflow-y-auto">
          {issues.map((issue) => {
            const elapsed = differenceInCalendarDays(new Date(), new Date(issue.created_at))
            return (
              <Link
                key={issue.id}
                href={`/issues/${issue.id}`}
                className="flex items-center gap-[8px] px-[12px] py-[8px] border-b border-border2 last:border-b-0 no-underline hover:bg-surf2 transition-colors"
              >
                <span className="text-[11px] text-mint-dd font-mono shrink-0 w-[60px]">
                  {issue.issue_key}
                </span>
                <span className="text-[12px] text-text truncate flex-1">{issue.title}</span>
                <div className="shrink-0">
                  <SeverityBadge severity={issue.severity} />
                </div>
                <div className="shrink-0 hidden md:block">
                  <IssueStatusBadge status={issue.status} size="sm" />
                </div>
                <span className="text-[10px] text-text3 w-[40px] text-right shrink-0 hidden md:block">
                  {elapsed}d
                </span>
              </Link>
            )
          })}
        </div>
      )}

      <div className="px-[12px] py-[8px] border-t border-border2 bg-surf2">
        <Link href="/issues" className="text-[11px] text-mint-dd hover:underline font-medium">
          {t('mypage.viewAllIssues')} →
        </Link>
      </div>
    </div>
  )
}
