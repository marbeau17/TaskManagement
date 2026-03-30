'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Topbar } from '@/components/layout'
import { Avatar, FilterBar, Pagination, SeverityBadge, IssueTypeBadge, IssueStatusBadge } from '@/components/shared'
import { useIssues, useDeleteIssue, useUpdateIssue } from '@/hooks/useIssues'
import { useProjects } from '@/hooks/useProjects'
import { useMembers } from '@/hooks/useMembers'
import { useDebounce } from '@/hooks/useDebounce'
import { formatDate } from '@/lib/utils'
import { exportIssuesCsv } from '@/lib/issue-csv-export'
import { usePermission } from '@/hooks/usePermission'
import { useI18n } from '@/hooks/useI18n'
import type { IssueFilters } from '@/types/issue'

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function IssuesPage() {
  const router = useRouter()
  const { can } = usePermission()
  const { t } = useI18n()
  const deleteIssueMutation = useDeleteIssue()
  const [searchInput, setSearchInput] = useState('')
  const search = useDebounce(searchInput, 300)
  const [projectFilter, setProjectFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [severityFilter, setSeverityFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [assigneeFilter, setAssigneeFilter] = useState('')
  const [sourceFilter, setSourceFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [editingCell, setEditingCell] = useState<{ issueId: string; field: string } | null>(null)
  const [editDraft, setEditDraft] = useState('')
  const updateIssueMutation = useUpdateIssue()

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

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [filters])

  const handleInlineSave = (issueId: string, field: string, value: any) => {
    updateIssueMutation.mutate({ id: issueId, data: { [field]: value } })
    setEditingCell(null)
  }
  const startEdit = (issueId: string, field: string, currentValue: string) => {
    setEditingCell({ issueId, field })
    setEditDraft(currentValue ?? '')
  }

  const paginatedIssues = useMemo(() => {
    if (!issues) return []
    if (pageSize === 0) return issues
    const start = (currentPage - 1) * pageSize
    return issues.slice(start, start + pageSize)
  }, [issues, currentPage, pageSize])

  return (
    <>
      <Topbar title={t('issues.title')}>
        <button
          onClick={() => {
            if (issues && issues.length > 0) exportIssuesCsv(issues)
          }}
          disabled={!issues || issues.length === 0}
          className="px-[14px] py-[6px] text-[12px] font-semibold text-text bg-surf2 border border-wf-border rounded-[6px] hover:bg-wf-border transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {t('issues.csvExport')}
        </button>
        {can('issues', 'create') && (
          <button
            onClick={() => router.push('/issues/new')}
            className="px-[14px] py-[6px] text-[12px] font-semibold text-white bg-mint rounded-[6px] hover:bg-mint-d transition-colors"
          >
            {t('issues.newIssue')}
          </button>
        )}
      </Topbar>

      <div className="flex-1 overflow-auto p-[12px] md:p-[20px]">
        {/* Filters */}
        <div className="mb-[16px]">
          <FilterBar
            searchValue={searchInput}
            onSearchChange={setSearchInput}
            filters={[
              {
                label: t('issues.filterProject'),
                value: projectFilter,
                options: projectOptions,
                onChange: setProjectFilter,
              },
              {
                label: t('issues.filterType'),
                value: typeFilter,
                options: [
                  { label: t('issues.bug'), value: 'bug' },
                  { label: t('issues.improvement'), value: 'improvement' },
                  { label: t('issues.question'), value: 'question' },
                  { label: t('issues.incident'), value: 'incident' },
                ],
                onChange: setTypeFilter,
              },
              {
                label: t('issues.filterSeverity'),
                value: severityFilter,
                options: [
                  { label: t('issues.critical'), value: 'critical' },
                  { label: t('issues.high'), value: 'high' },
                  { label: t('issues.medium'), value: 'medium' },
                  { label: t('issues.low'), value: 'low' },
                ],
                onChange: setSeverityFilter,
              },
              {
                label: t('issues.filterStatus'),
                value: statusFilter,
                options: [
                  { label: t('issues.open'), value: 'open' },
                  { label: t('issues.inProgress'), value: 'in_progress' },
                  { label: t('issues.resolved'), value: 'resolved' },
                  { label: t('issues.verified'), value: 'verified' },
                  { label: t('issues.closed'), value: 'closed' },
                ],
                onChange: setStatusFilter,
              },
              {
                label: t('issues.filterAssignee'),
                value: assigneeFilter,
                options: memberOptions,
                onChange: setAssigneeFilter,
              },
              {
                label: t('issues.filterSource'),
                value: sourceFilter,
                options: [
                  { label: t('issues.sourceInternal'), value: 'internal' },
                  { label: t('issues.sourceCustomer'), value: 'customer' },
                ],
                onChange: setSourceFilter,
              },
            ]}
          />
        </div>

        <div className="mb-[16px]">
          <Pagination
            page={currentPage}
            pageSize={pageSize}
            totalCount={issues?.length ?? 0}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
          />
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="text-center py-[40px] text-[13px] text-text3">
            {t('common.loading')}
          </div>
        )}

        {/* Issue cards - mobile */}
        {!isLoading && (
          <div className="md:hidden flex flex-col gap-[8px]">
            {(!issues || issues.length === 0) && (
              <div className="py-[32px] text-center text-text3 text-[13px]">
                {t('issues.notFound')}
              </div>
            )}
            {paginatedIssues.map((issue) => (
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
                    <span className="text-[11px] text-text3">{t('issues.unassigned')}</span>
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
                    <th className="px-[12px] py-[10px] text-[11px] font-semibold text-text2 whitespace-nowrap">{t('issues.colKey')}</th>
                    <th className="px-[12px] py-[10px] text-[11px] font-semibold text-text2 whitespace-nowrap">{t('issues.colType')}</th>
                    <th className="px-[12px] py-[10px] text-[11px] font-semibold text-text2 whitespace-nowrap">{t('issues.colTitle')}</th>
                    <th className="px-[12px] py-[10px] text-[11px] font-semibold text-text2 whitespace-nowrap">{t('issues.colSeverity')}</th>
                    <th className="px-[12px] py-[10px] text-[11px] font-semibold text-text2 whitespace-nowrap">{t('issues.colStatus')}</th>
                    <th className="px-[12px] py-[10px] text-[11px] font-semibold text-text2 whitespace-nowrap">{t('issues.colAssignee')}</th>
                    <th className="px-[12px] py-[10px] text-[11px] font-semibold text-text2 whitespace-nowrap">{t('issues.colProject')}</th>
                    <th className="px-[12px] py-[10px] text-[11px] font-semibold text-text2 whitespace-nowrap">{t('issues.colCreatedAt')}</th>
                    <th className="px-[12px] py-[10px] text-[11px] font-semibold text-text2 whitespace-nowrap w-[60px]"></th>
                  </tr>
                </thead>
                <tbody>
                  {(!issues || issues.length === 0) && (
                    <tr>
                      <td colSpan={8} className="px-[12px] py-[32px] text-center text-text3 text-[13px]">
                        {t('issues.notFound')}
                      </td>
                    </tr>
                  )}
                  {paginatedIssues.map((issue) => (
                    <tr
                      key={issue.id}
                      onClick={() => { if (!editingCell) router.push(`/issues/${issue.id}`) }}
                      className="border-b border-wf-border cursor-pointer hover:bg-surf2/50 transition-colors"
                    >
                      <td className="px-[12px] py-[10px] text-[12px] font-mono text-mint font-bold whitespace-nowrap tracking-wide">
                        {issue.issue_key}
                      </td>
                      <td className="px-[12px] py-[10px]">
                        <IssueTypeBadge type={issue.type} size="sm" />
                      </td>
                      <td className="px-[12px] py-[10px] min-w-[180px]"
                        onDoubleClick={(e) => { e.stopPropagation(); startEdit(issue.id, 'title', issue.title) }}
                      >
                        {editingCell?.issueId === issue.id && editingCell.field === 'title' ? (
                          <input
                            type="text"
                            value={editDraft}
                            onChange={(e) => setEditDraft(e.target.value)}
                            onBlur={() => handleInlineSave(issue.id, 'title', editDraft)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleInlineSave(issue.id, 'title', editDraft)
                              if (e.key === 'Escape') setEditingCell(null)
                            }}
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                            className="text-[12.5px] font-bold text-text bg-surface border border-mint rounded px-1 py-0.5 w-full focus:outline-none"
                          />
                        ) : (
                          <div className="text-[12.5px] font-bold text-text leading-tight">{issue.title}</div>
                        )}
                      </td>
                      <td className="px-[12px] py-[10px]"
                        onDoubleClick={(e) => { e.stopPropagation(); startEdit(issue.id, 'severity', issue.severity) }}
                      >
                        {editingCell?.issueId === issue.id && editingCell.field === 'severity' ? (
                          <select
                            value={editDraft}
                            onChange={(e) => handleInlineSave(issue.id, 'severity', e.target.value)}
                            onBlur={() => setEditingCell(null)}
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                            className="text-[11px] text-text bg-surface border border-mint rounded px-1 py-0.5 focus:outline-none"
                          >
                            <option value="critical">{t('issues.critical')}</option>
                            <option value="high">{t('issues.high')}</option>
                            <option value="medium">{t('issues.medium')}</option>
                            <option value="low">{t('issues.low')}</option>
                          </select>
                        ) : (
                          <SeverityBadge severity={issue.severity} size="sm" />
                        )}
                      </td>
                      <td className="px-[12px] py-[10px]"
                        onDoubleClick={(e) => { e.stopPropagation(); startEdit(issue.id, 'status', issue.status) }}
                      >
                        {editingCell?.issueId === issue.id && editingCell.field === 'status' ? (
                          <select
                            value={editDraft}
                            onChange={(e) => handleInlineSave(issue.id, 'status', e.target.value)}
                            onBlur={() => setEditingCell(null)}
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                            className="text-[11px] text-text bg-surface border border-mint rounded px-1 py-0.5 focus:outline-none"
                          >
                            <option value="open">{t('issues.open')}</option>
                            <option value="in_progress">{t('issues.inProgress')}</option>
                            <option value="resolved">{t('issues.resolved')}</option>
                            <option value="verified">{t('issues.verified')}</option>
                            <option value="closed">{t('issues.closed')}</option>
                          </select>
                        ) : (
                          <IssueStatusBadge status={issue.status} size="sm" />
                        )}
                      </td>
                      <td className="px-[12px] py-[10px]"
                        onDoubleClick={(e) => { e.stopPropagation(); startEdit(issue.id, 'assigned_to', issue.assigned_to ?? '') }}
                      >
                        {editingCell?.issueId === issue.id && editingCell.field === 'assigned_to' ? (
                          <select
                            value={editDraft}
                            onChange={(e) => handleInlineSave(issue.id, 'assigned_to', e.target.value || null)}
                            onBlur={() => setEditingCell(null)}
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                            className="text-[11.5px] text-text bg-surface border border-mint rounded px-1 py-0.5 focus:outline-none"
                          >
                            <option value="">{t('issues.unassigned')}</option>
                            {(members ?? []).filter((m) => m.is_active).map((m) => (
                              <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                          </select>
                        ) : issue.assignee ? (
                          <div className="flex items-center gap-[4px]">
                            <Avatar name_short={issue.assignee.name_short} color={issue.assignee.avatar_color} size="sm" />
                            <span className="text-[11px] text-text whitespace-nowrap">{issue.assignee.name}</span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-text3">{t('issues.unassigned')}</span>
                        )}
                      </td>
                      <td className="px-[12px] py-[10px] text-[11.5px] text-text whitespace-nowrap">
                        {issue.project?.name ?? '-'}
                      </td>
                      <td className="px-[12px] py-[10px] text-[11.5px] text-text whitespace-nowrap">
                        {formatDate(issue.created_at)}
                      </td>
                      <td className="px-[12px] py-[10px]">
                        {can('issues', 'delete') && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              if (window.confirm(t('common.deleteConfirm'))) {
                                deleteIssueMutation.mutate(issue.id)
                              }
                            }}
                            className="text-[11px] text-text3 hover:text-danger transition-colors"
                            title={t('common.delete')}
                          >
                            ✕
                          </button>
                        )}
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
