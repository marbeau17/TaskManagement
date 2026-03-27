'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useIssue, useUpdateIssue, useTransitionIssueStatus, useIssueComments, useAddIssueComment } from '@/hooks/useIssues'
import { useMembers } from '@/hooks/useMembers'
import { useAuth } from '@/hooks/useAuth'
import { Avatar, SeverityBadge, IssueTypeBadge, IssueStatusBadge } from '@/components/shared'
import { formatDate } from '@/lib/utils'
import { isValidTransition } from '@/lib/data/issues'
import { IssueRelations } from '@/components/issues/IssueRelations'
import { useI18n } from '@/hooks/useI18n'
import type { IssueStatus } from '@/types/issue'

// ---------------------------------------------------------------------------
// Valid transitions map for UI buttons
// ---------------------------------------------------------------------------

const TRANSITION_KEYS: Record<IssueStatus, string> = {
  open: 'issues.transitionOpen',
  in_progress: 'issues.transitionInProgress',
  resolved: 'issues.transitionResolved',
  verified: 'issues.transitionVerified',
  closed: 'issues.transitionClosed',
}

// ---------------------------------------------------------------------------
// Collapsible section
// ---------------------------------------------------------------------------

function CollapsibleSection({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border border-border2 rounded-[8px] overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-[12px] py-[8px] bg-surf2 text-left flex items-center justify-between text-[12px] font-semibold text-text hover:bg-border2/50 transition-colors"
      >
        {title}
        <span className="text-text3">{open ? '\u25B2' : '\u25BC'}</span>
      </button>
      {open && (
        <div className="px-[12px] py-[10px] text-[12.5px] text-text whitespace-pre-wrap">
          {children}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Comment section for issues
// ---------------------------------------------------------------------------

function IssueCommentSection({ issueId, currentUserId }: { issueId: string; currentUserId: string }) {
  const { t } = useI18n()
  const { data: comments, isLoading } = useIssueComments(issueId)
  const addComment = useAddIssueComment()
  const [body, setBody] = useState('')

  const handleSend = () => {
    const trimmed = body.trim()
    if (!trimmed) return
    addComment.mutate({ issueId, body: trimmed }, { onSuccess: () => setBody('') })
  }

  return (
    <div className="bg-surface rounded-lg border border-wf-border p-5">
      <h3 className="text-[13px] font-bold text-text mb-4">{t('issues.comments')}</h3>

      <div className="flex flex-col gap-3 mb-4 max-h-[400px] overflow-y-auto">
        {isLoading && <p className="text-[12px] text-text3">{t('common.loading')}</p>}
        {comments && comments.length === 0 && <p className="text-[12px] text-text3">{t('issues.noComments')}</p>}
        {comments?.map((comment) => {
          const isOwn = comment.user_id === currentUserId
          return (
            <div key={comment.id} className={`rounded-md p-3 ${isOwn ? 'bg-mint-ll' : 'bg-surf2'}`}>
              <div className="flex items-center gap-2 mb-1.5">
                {comment.user && (
                  <Avatar name_short={comment.user.name_short} color={comment.user.avatar_color} size="sm" />
                )}
                <span className="text-[12px] font-semibold text-text">{comment.user?.name ?? t('issues.unknown')}</span>
                <span className="text-[10px] text-text3 ml-auto">{formatDate(comment.created_at)}</span>
              </div>
              <p className="text-[12.5px] text-text whitespace-pre-wrap leading-relaxed">{comment.body}</p>
            </div>
          )
        })}
      </div>

      <div className="flex flex-col gap-2">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={t('issues.commentPlaceholder')}
          rows={3}
          className="w-full border border-wf-border rounded-md px-3 py-2 text-[12.5px] text-text bg-surface resize-none focus:outline-none focus:border-mint"
        />
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSend}
            disabled={!body.trim() || addComment.isPending}
            className="px-4 py-1.5 rounded-md text-[12px] font-bold bg-mint text-white hover:bg-mint-d transition-colors disabled:opacity-50"
          >
            {addComment.isPending ? t('issues.sending') : t('issues.send')}
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function IssueDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { t } = useI18n()
  const { user } = useAuth()
  const { data: issue, isLoading } = useIssue(params.id)
  const { data: members } = useMembers()
  const updateIssue = useUpdateIssue()
  const transitionStatus = useTransitionIssueStatus()
  const [resolutionNotes, setResolutionNotes] = useState('')
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-[13px] text-text3">{t('common.loading')}</div>
      </div>
    )
  }

  if (!issue) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-[13px] text-text3">{t('issues.issueNotFound')}</div>
      </div>
    )
  }

  // Possible transitions
  const possibleTransitions: IssueStatus[] = (['open', 'in_progress', 'resolved', 'verified', 'closed'] as IssueStatus[]).filter(
    (s) => s !== issue.status && isValidTransition(issue.status, s)
  )

  const handleTransition = (newStatus: IssueStatus) => {
    transitionStatus.mutate({ id: issue.id, newStatus })
  }

  const handleAssigneeChange = (userId: string | null) => {
    updateIssue.mutate({ id: issue.id, data: { assigned_to: userId } })
    setShowAssigneeDropdown(false)
  }

  const handleSaveResolutionNotes = () => {
    updateIssue.mutate({ id: issue.id, data: { resolution_notes: resolutionNotes } })
  }

  const isBugOrIncident = issue.type === 'bug' || issue.type === 'incident'

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="shrink-0 flex flex-wrap items-center gap-2 md:gap-3 px-3 md:px-6 py-3 border-b border-wf-border bg-surface">
        <button
          type="button"
          onClick={() => router.back()}
          className="text-[12px] text-text2 hover:text-mint transition-colors"
        >
          {t('issues.backToList')}
        </button>
        <span className="text-[16px] font-mono text-mint font-bold tracking-wide">{issue.issue_key}</span>
        <h1 className="text-[15px] font-bold text-text truncate max-w-[400px]">
          {issue.title}
        </h1>
        <IssueTypeBadge type={issue.type} />
        <IssueStatusBadge status={issue.status} />
        <div className="flex-1" />

        {/* Status transition buttons */}
        {possibleTransitions.map((status) => {
          const isClose = status === 'closed'
          const isReopen = status === 'open'
          return (
            <button
              key={status}
              onClick={() => handleTransition(status)}
              disabled={transitionStatus.isPending}
              className={`px-3 py-1.5 rounded-md text-[12px] font-bold transition-colors disabled:opacity-50 ${
                isClose
                  ? 'border border-danger-b text-danger bg-danger-bg hover:bg-danger hover:text-white'
                  : isReopen
                    ? 'border border-warn-b text-warn bg-warn-bg hover:bg-warn hover:text-white'
                    : 'bg-mint text-white hover:bg-mint-d'
              }`}
            >
              {t(TRANSITION_KEYS[status])}
            </button>
          )
        })}
      </div>

      {/* 2-column layout */}
      <div className="flex-1 overflow-y-auto p-3 md:p-6 grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-4 lg:gap-6 items-start">
        {/* Left column */}
        <div className="flex flex-col gap-4">
          {/* Description */}
          <div className="bg-surface rounded-lg border border-wf-border p-5">
            <h3 className="text-[13px] font-bold text-text mb-3">{t('issues.description')}</h3>
            <div className="text-[12.5px] text-text whitespace-pre-wrap leading-relaxed">
              {issue.description || t('issues.noDescription')}
            </div>
          </div>

          {/* Bug/Incident specific sections */}
          {isBugOrIncident && (
            <div className="flex flex-col gap-3">
              {issue.type === 'bug' && (
                <CollapsibleSection title={t('issues.reproductionSteps')} defaultOpen={!!issue.reproduction_steps}>
                  {issue.reproduction_steps || t('issues.notFilled')}
                </CollapsibleSection>
              )}
              <CollapsibleSection title={t('issues.expectedResult')} defaultOpen={!!issue.expected_result}>
                {issue.expected_result || t('issues.notFilled')}
              </CollapsibleSection>
              <CollapsibleSection title={t('issues.actualResult')} defaultOpen={!!issue.actual_result}>
                {issue.actual_result || t('issues.notFilled')}
              </CollapsibleSection>
            </div>
          )}

          {/* Comments */}
          <IssueCommentSection issueId={issue.id} currentUserId={user?.id ?? ''} />
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-4">
          {/* Details card */}
          <div className="bg-surface rounded-lg border border-wf-border p-5 space-y-[14px]">
            {/* Status */}
            <div>
              <div className="text-[10.5px] text-text2 mb-[3px]">{t('issues.filterStatus')}</div>
              <IssueStatusBadge status={issue.status} />
            </div>

            {/* Severity */}
            <div>
              <div className="text-[10.5px] text-text2 mb-[3px]">{t('issues.filterSeverity')}</div>
              <SeverityBadge severity={issue.severity} />
            </div>

            {/* Priority */}
            <div>
              <div className="text-[10.5px] text-text2 mb-[3px]">{t('issues.priority')}</div>
              <div className="text-[12.5px] text-text">{issue.priority}</div>
            </div>

            {/* Assignee */}
            <div className="relative">
              <div className="text-[10.5px] text-text2 mb-[3px]">{t('issues.filterAssignee')}</div>
              <button
                onClick={() => setShowAssigneeDropdown(!showAssigneeDropdown)}
                className="flex items-center gap-[6px] hover:bg-surf2 rounded-[4px] px-[4px] py-[2px] -ml-[4px] transition-colors"
              >
                {issue.assignee ? (
                  <>
                    <Avatar name_short={issue.assignee.name_short} color={issue.assignee.avatar_color} size="sm" />
                    <span className="text-[12px] text-text">{issue.assignee.name}</span>
                  </>
                ) : (
                  <span className="text-[12px] text-text3">{t('issues.unassignedClickToChange')}</span>
                )}
              </button>
              {showAssigneeDropdown && (
                <div className="absolute top-full left-0 mt-[4px] bg-surface border border-border2 rounded-[8px] shadow-lg z-10 w-[200px] max-h-[200px] overflow-y-auto">
                  <button
                    onClick={() => handleAssigneeChange(null)}
                    className="w-full text-left px-[10px] py-[6px] text-[12px] text-text3 hover:bg-surf2 transition-colors"
                  >
                    {t('issues.unassigned')}
                  </button>
                  {(members ?? []).filter((m) => m.is_active).map((m) => (
                    <button
                      key={m.id}
                      onClick={() => handleAssigneeChange(m.id)}
                      className="w-full text-left px-[10px] py-[6px] text-[12px] text-text hover:bg-surf2 transition-colors flex items-center gap-[6px]"
                    >
                      <Avatar name_short={m.name_short} color={m.avatar_color} size="sm" />
                      {m.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Reporter */}
            <div>
              <div className="text-[10.5px] text-text2 mb-[3px]">{t('issues.reporter')}</div>
              {issue.reporter ? (
                <div className="flex items-center gap-[6px]">
                  <Avatar name_short={issue.reporter.name_short} color={issue.reporter.avatar_color} size="sm" />
                  <span className="text-[12px] text-text">{issue.reporter.name}</span>
                </div>
              ) : (
                <span className="text-[12px] text-text3">{t('issues.unknown')}</span>
              )}
            </div>

            {/* Project */}
            <div>
              <div className="text-[10.5px] text-text2 mb-[3px]">{t('issues.filterProject')}</div>
              {issue.project ? (
                <button
                  onClick={() => router.push(`/projects/${issue.project!.id}`)}
                  className="text-[12px] text-mint hover:text-mint-d font-medium transition-colors"
                >
                  {issue.project.name}
                </button>
              ) : (
                <span className="text-[12px] text-text3">-</span>
              )}
            </div>

            {/* Linked task */}
            {issue.task_id && (
              <div>
                <div className="text-[10.5px] text-text2 mb-[3px]">{t('issues.linkedTask')}</div>
                <button
                  onClick={() => router.push(`/tasks/${issue.task_id}`)}
                  className="text-[12px] text-mint hover:text-mint-d font-medium transition-colors"
                >
                  {t('issues.viewTask')}
                </button>
              </div>
            )}

            {/* Git branch / PR */}
            {(issue.git_branch || issue.git_pr_url) && (
              <>
                {issue.git_branch && (
                  <div>
                    <div className="text-[10.5px] text-text2 mb-[3px]">{t('issues.gitBranch')}</div>
                    <div className="text-[12px] text-text font-mono bg-surf2 px-[6px] py-[2px] rounded-[4px] inline-block">
                      {issue.git_branch}
                    </div>
                  </div>
                )}
                {issue.git_pr_url && (
                  <div>
                    <div className="text-[10.5px] text-text2 mb-[3px]">PR URL</div>
                    <a
                      href={issue.git_pr_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[12px] text-mint hover:text-mint-d font-medium transition-colors break-all"
                    >
                      {issue.git_pr_url}
                    </a>
                  </div>
                )}
              </>
            )}

            {/* Labels */}
            {issue.labels && issue.labels.length > 0 && (
              <div>
                <div className="text-[10.5px] text-text2 mb-[3px]">{t('issues.labels')}</div>
                <div className="flex flex-wrap gap-[4px]">
                  {issue.labels.map((label) => (
                    <span key={label} className="text-[10px] px-[7px] py-[1px] rounded-full bg-surf2 text-text2 border border-border2">
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Source */}
            <div>
              <div className="text-[10.5px] text-text2 mb-[3px]">{t('issues.filterSource')}</div>
              <div className="text-[12px] text-text">{issue.source === 'customer' ? t('issues.sourceCustomer') : t('issues.sourceInternal')}</div>
            </div>

            {/* Dates */}
            <div className="border-t border-border2 pt-[10px] space-y-[6px]">
              <div className="flex justify-between text-[11px]">
                <span className="text-text2">{t('issues.colCreatedAt')}</span>
                <span className="text-text">{formatDate(issue.created_at)}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-text2">{t('issues.updatedAt')}</span>
                <span className="text-text">{formatDate(issue.updated_at)}</span>
              </div>
              {issue.reopen_count > 0 && (
                <div className="flex justify-between text-[11px]">
                  <span className="text-text2">{t('issues.reopenCount')}</span>
                  <span className="text-danger font-semibold">{issue.reopen_count}</span>
                </div>
              )}
            </div>
          </div>

          {/* Issue Relations */}
          <IssueRelations issueId={issue.id} />

          {/* Resolution notes */}
          {(issue.status === 'resolved' || issue.status === 'verified' || issue.status === 'closed' || issue.resolution_notes) && (
            <div className="bg-surface rounded-lg border border-wf-border p-5">
              <h3 className="text-[13px] font-bold text-text mb-3">{t('issues.resolutionNotes')}</h3>
              <textarea
                value={resolutionNotes || issue.resolution_notes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                rows={4}
                placeholder={t('issues.resolutionPlaceholder')}
                className="w-full border border-wf-border rounded-md px-3 py-2 text-[12.5px] text-text bg-surface resize-y focus:outline-none focus:border-mint"
              />
              <div className="flex justify-end mt-[8px]">
                <button
                  onClick={handleSaveResolutionNotes}
                  disabled={updateIssue.isPending}
                  className="px-3 py-1.5 rounded-md text-[12px] font-bold bg-mint text-white hover:bg-mint-d transition-colors disabled:opacity-50"
                >
                  {t('common.save')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
