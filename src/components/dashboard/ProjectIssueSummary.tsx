'use client'

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useProjects } from '@/hooks/useProjects'
import { useIssues } from '@/hooks/useIssues'
import { useI18n } from '@/hooks/useI18n'

export function ProjectIssueSummary() {
  const router = useRouter()
  const { t } = useI18n()
  const { data: projects } = useProjects()
  const { data: issues } = useIssues()

  const projectSummaries = useMemo(() => {
    if (!projects || !issues) return []

    // Only consider open issues (not closed, not verified)
    const openIssues = issues.filter(
      (i) => i.status === 'open' || i.status === 'in_progress' || i.status === 'resolved'
    )

    return projects
      .map((project) => {
        const projectIssues = openIssues.filter((i) => i.project_id === project.id)
        const criticalCount = projectIssues.filter((i) => i.severity === 'critical').length
        const highCount = projectIssues.filter((i) => i.severity === 'high').length

        return {
          id: project.id,
          name: project.name,
          keyPrefix: project.key_prefix,
          totalOpen: projectIssues.length,
          criticalCount,
          highCount,
        }
      })
      .filter((s) => s.totalOpen > 0)
      .sort((a, b) => b.criticalCount - a.criticalCount || b.totalOpen - a.totalOpen)
  }, [projects, issues])

  if (!projects || !issues) {
    return (
      <div className="bg-surface border border-border2 rounded-[10px] p-[16px]">
        <h3 className="text-[13px] font-bold text-text mb-[12px]">{t('dashboard.projectIssueSummaryTitle')}</h3>
        <p className="text-[12px] text-text3">{t('common.loading')}</p>
      </div>
    )
  }

  return (
    <div className="bg-surface border border-border2 rounded-[10px] p-[16px]">
      <h3 className="text-[13px] font-bold text-text mb-[12px]">{t('dashboard.projectIssueSummaryTitle')}</h3>

      {projectSummaries.length === 0 ? (
        <p className="text-[12px] text-text3">{t('dashboard.noOpenIssues')}</p>
      ) : (
        <div className="flex flex-col gap-[8px]">
          {projectSummaries.map((summary) => (
            <div
              key={summary.id}
              onClick={() => router.push(`/issues?project_id=${summary.id}`)}
              className="flex items-center justify-between px-[12px] py-[10px] rounded-[8px] bg-surf2 border border-border2 cursor-pointer hover:border-mint transition-colors"
            >
              <div className="flex items-center gap-[8px] min-w-0">
                <span className="text-[10px] font-mono text-mint font-semibold shrink-0">
                  {summary.keyPrefix}
                </span>
                <span className="text-[12.5px] font-semibold text-text truncate">
                  {summary.name}
                </span>
              </div>

              <div className="flex items-center gap-[6px] shrink-0 ml-[8px]">
                {summary.criticalCount > 0 && (
                  <span className="text-[10px] font-bold text-white bg-red-500 rounded-full px-[7px] py-[1px] min-w-[20px] text-center">
                    {summary.criticalCount}
                  </span>
                )}
                {summary.highCount > 0 && (
                  <span className="text-[10px] font-bold text-white bg-orange-500 rounded-full px-[7px] py-[1px] min-w-[20px] text-center">
                    {summary.highCount}
                  </span>
                )}
                <span className="text-[11px] text-text2 font-medium">
                  {summary.totalOpen} {t('dashboard.issueCount')}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
