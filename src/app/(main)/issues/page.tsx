'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Topbar } from '@/components/layout'
import { Avatar, FilterBar, SeverityBadge, IssueTypeBadge, IssueStatusBadge } from '@/components/shared'
import { useIssues } from '@/hooks/useIssues'
import { useProjects } from '@/hooks/useProjects'
import { useMembers } from '@/hooks/useMembers'
import { formatDate } from '@/lib/utils'
import { exportIssuesCsv } from '@/lib/issue-csv-export'
import { usePermission } from '@/hooks/usePermission'
import type { IssueFilters } from '@/types/issue'

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function IssuesPage() {
  const router = useRouter()
  const { can } = usePermission()
  const [search, setSearch] = useState('')
  const [projectFilter, setProjectFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [severityFilter, setSeverityFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [assigneeFilter, setAssigneeFilter] = useState('')
  const [sourceFilter, setSourceFilter] = useState('')

  const filters: IssueFilters = useMemo(() => ({
    search: search || undefined,
    project_id: projectFilter || undefined,
    type: (typeFilter as IssueFilters['type']) || undefined,
    severity: (severityFilter as IssueFilters['severity']) || undefined,
    status: (statusFilter as IssueFilters['status']) || undefined,
    assigned_to: assigneeFilter || undefined,
    source: sourceFilter || undefined,
  }), [search, projectFilter, typeFilter, severityFilter, statusFilter, assigneeFilter, sourceFilter])

  const { data: issues, isLoading } = useIssues(filters)
  const { data: projects } = useProjects()
  const { data: members } = useMembers()

  const projectOptions = useMemo(
    () => (projects ?? []).map((p) => ({ label: p.name, value: p.id })),
    [projects]
  )

  const memberOptions = useMemo(
    () => (members ?? []).filter((m) => m.is_active).map((m) => ({ label: m.name, value: m.id })),
    [members]
  )

  return (
    <>
      <Topbar title="課題管理">
        <button
          onClick={() => {
            if (issues && issues.length > 0) exportIssuesCsv(issues)
          }}
          disabled={!issues || issues.length === 0}
          className="px-[14px] py-[6px] text-[12px] font-semibold text-text bg-surf2 border border-wf-border rounded-[6px] hover:bg-wf-border transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          CSV出力
        </button>
        {can('issues', 'create') && (
          <button
            onClick={() => router.push('/issues/new')}
            className="px-[14px] py-[6px] text-[12px] font-semibold text-white bg-mint rounded-[6px] hover:bg-mint-d transition-colors"
          >
            + 課題報告
          </button>
        )}
      </Topbar>

      <div className="flex-1 overflow-auto p-[12px] md:p-[20px]">
        {/* Filters */}
        <div className="mb-[16px]">
          <FilterBar
            searchValue={search}
            onSearchChange={setSearch}
            filters={[
              {
                label: 'プロジェクト',
                value: projectFilter,
                options: projectOptions,
                onChange: setProjectFilter,
              },
              {
                label: 'タイプ',
                value: typeFilter,
                options: [
                  { label: 'バグ', value: 'bug' },
                  { label: '改善', value: 'improvement' },
                  { label: '質問', value: 'question' },
                  { label: 'インシデント', value: 'incident' },
                ],
                onChange: setTypeFilter,
              },
              {
                label: '重要度',
                value: severityFilter,
                options: [
                  { label: 'Critical', value: 'critical' },
                  { label: 'High', value: 'high' },
                  { label: 'Medium', value: 'medium' },
                  { label: 'Low', value: 'low' },
                ],
                onChange: setSeverityFilter,
              },
              {
                label: 'ステータス',
                value: statusFilter,
                options: [
                  { label: 'オープン', value: 'open' },
                  { label: '対応中', value: 'in_progress' },
                  { label: '解決済', value: 'resolved' },
                  { label: '検証済', value: 'verified' },
                  { label: 'クローズ', value: 'closed' },
                ],
                onChange: setStatusFilter,
              },
              {
                label: '担当者',
                value: assigneeFilter,
                options: memberOptions,
                onChange: setAssigneeFilter,
              },
              {
                label: 'ソース',
                value: sourceFilter,
                options: [
                  { label: '社内', value: 'internal' },
                  { label: '顧客', value: 'customer' },
                ],
                onChange: setSourceFilter,
              },
            ]}
          />
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="text-center py-[40px] text-[13px] text-text3">
            読み込み中...
          </div>
        )}

        {/* Issue cards - mobile */}
        {!isLoading && (
          <div className="md:hidden flex flex-col gap-[8px]">
            {(!issues || issues.length === 0) && (
              <div className="py-[32px] text-center text-text3 text-[13px]">
                課題が見つかりませんでした
              </div>
            )}
            {issues?.map((issue) => (
              <div
                key={issue.id}
                onClick={() => router.push(`/issues/${issue.id}`)}
                className="bg-surface border border-border2 rounded-[8px] p-[12px] cursor-pointer hover:border-mint transition-colors"
              >
                <div className="flex items-center justify-between mb-[6px]">
                  <span className="text-[11.5px] font-mono text-mint font-bold tracking-wide">{issue.issue_key}</span>
                  <IssueStatusBadge status={issue.status} size="sm" />
                </div>
                <div className="text-[13px] font-bold text-text mb-[6px] leading-tight">{issue.title}</div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-[6px]">
                    <IssueTypeBadge type={issue.type} size="sm" />
                    <SeverityBadge severity={issue.severity} size="sm" />
                  </div>
                  {issue.assignee ? (
                    <div className="flex items-center gap-[4px]">
                      <Avatar name_short={issue.assignee.name_short} color={issue.assignee.avatar_color} size="sm" />
                      <span className="text-[11px] text-text">{issue.assignee.name}</span>
                    </div>
                  ) : (
                    <span className="text-[11px] text-text3">未アサイン</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Issue table - desktop */}
        {!isLoading && (
          <div className="hidden md:block bg-surface border border-border2 rounded-[10px] shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-wf-border">
                    <th className="px-[12px] py-[10px] text-[11px] font-semibold text-text2 whitespace-nowrap">キー</th>
                    <th className="px-[12px] py-[10px] text-[11px] font-semibold text-text2 whitespace-nowrap">タイプ</th>
                    <th className="px-[12px] py-[10px] text-[11px] font-semibold text-text2 whitespace-nowrap">タイトル</th>
                    <th className="px-[12px] py-[10px] text-[11px] font-semibold text-text2 whitespace-nowrap">重要度</th>
                    <th className="px-[12px] py-[10px] text-[11px] font-semibold text-text2 whitespace-nowrap">ステータス</th>
                    <th className="px-[12px] py-[10px] text-[11px] font-semibold text-text2 whitespace-nowrap">担当者</th>
                    <th className="px-[12px] py-[10px] text-[11px] font-semibold text-text2 whitespace-nowrap">プロジェクト</th>
                    <th className="px-[12px] py-[10px] text-[11px] font-semibold text-text2 whitespace-nowrap">作成日</th>
                  </tr>
                </thead>
                <tbody>
                  {(!issues || issues.length === 0) && (
                    <tr>
                      <td colSpan={8} className="px-[12px] py-[32px] text-center text-text3 text-[13px]">
                        課題が見つかりませんでした
                      </td>
                    </tr>
                  )}
                  {issues?.map((issue) => (
                    <tr
                      key={issue.id}
                      onClick={() => router.push(`/issues/${issue.id}`)}
                      className="border-b border-wf-border cursor-pointer hover:bg-surf2/50 transition-colors"
                    >
                      <td className="px-[12px] py-[10px] text-[12px] font-mono text-mint font-bold whitespace-nowrap tracking-wide">
                        {issue.issue_key}
                      </td>
                      <td className="px-[12px] py-[10px]">
                        <IssueTypeBadge type={issue.type} size="sm" />
                      </td>
                      <td className="px-[12px] py-[10px] min-w-[180px]">
                        <div className="text-[12.5px] font-bold text-text leading-tight">{issue.title}</div>
                      </td>
                      <td className="px-[12px] py-[10px]">
                        <SeverityBadge severity={issue.severity} size="sm" />
                      </td>
                      <td className="px-[12px] py-[10px]">
                        <IssueStatusBadge status={issue.status} size="sm" />
                      </td>
                      <td className="px-[12px] py-[10px]">
                        {issue.assignee ? (
                          <div className="flex items-center gap-[4px]">
                            <Avatar name_short={issue.assignee.name_short} color={issue.assignee.avatar_color} size="sm" />
                            <span className="text-[11px] text-text whitespace-nowrap">{issue.assignee.name}</span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-text3">未アサイン</span>
                        )}
                      </td>
                      <td className="px-[12px] py-[10px] text-[11.5px] text-text whitespace-nowrap">
                        {issue.project?.name ?? '-'}
                      </td>
                      <td className="px-[12px] py-[10px] text-[11.5px] text-text whitespace-nowrap">
                        {formatDate(issue.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
