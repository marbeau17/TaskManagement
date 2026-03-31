'use client'

import { useState, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useProject, useUpdateProject, useDeleteProject } from '@/hooks/useProjects'
import { useTasks } from '@/hooks/useTasks'
import { useIssues } from '@/hooks/useIssues'
import { useMembers } from '@/hooks/useMembers'
import {
  useProjectMembers,
  useAddProjectMember,
  useRemoveProjectMember,
} from '@/hooks/useProjects'
import { updateProjectMemberHours } from '@/lib/data/project-members'
import { useQueryClient } from '@tanstack/react-query'
import { Avatar, ProgressBar, KpiCard } from '@/components/shared'
import { IssueStatusBadge, SeverityBadge, IssueTypeBadge } from '@/components/shared'
import { TaskTable } from '@/components/tasks/TaskTable'
import { CustomFieldManager } from '@/components/projects/CustomFieldManager'
import { WorkflowEditor } from '@/components/projects/WorkflowEditor'
import { formatDate } from '@/lib/utils'
import { useI18n } from '@/hooks/useI18n'
import type { ProjectStatus } from '@/types/project'
import type { ProjectMember } from '@/types/database'

// ---------------------------------------------------------------------------
// Status config
// ---------------------------------------------------------------------------

const PROJECT_STATUS_STYLES: Record<ProjectStatus, { key: string; bg: string; text: string; border: string }> = {
  planning: { key: 'projects.statusPlanning', bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-600 dark:text-slate-300', border: 'border-slate-300 dark:border-slate-600' },
  active: { key: 'projects.statusActive', bg: 'bg-emerald-100 dark:bg-emerald-950/40', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-300 dark:border-emerald-800' },
  on_hold: { key: 'projects.statusOnHold', bg: 'bg-amber-100 dark:bg-amber-950/40', text: 'text-amber-700 dark:text-amber-400', border: 'border-amber-300 dark:border-amber-800' },
  completed: { key: 'projects.statusCompleted', bg: 'bg-blue-100 dark:bg-blue-950/40', text: 'text-blue-700 dark:text-blue-400', border: 'border-blue-300 dark:border-blue-800' },
  archived: { key: 'projects.statusArchived', bg: 'bg-gray-200 dark:bg-gray-800', text: 'text-gray-600 dark:text-gray-400', border: 'border-gray-400 dark:border-gray-600' },
}

// ---------------------------------------------------------------------------
// Add member modal (reused from old projects page pattern)
// ---------------------------------------------------------------------------

function AddMemberModal({
  projectName,
  existingMemberIds,
  members,
  onClose,
  onAdd,
  saving,
}: {
  projectName: string
  existingMemberIds: Set<string>
  members: { id: string; name: string; name_short: string; avatar_color: string; role: string }[]
  onClose: () => void
  onAdd: (memberId: string, allocatedHours: number) => void
  saving: boolean
}) {
  const { t } = useI18n()
  const [selectedMemberId, setSelectedMemberId] = useState('')
  const [hours, setHours] = useState('40')

  const availableMembers = members.filter((m) => !existingMemberIds.has(m.id))

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-surface rounded-[12px] shadow-xl border border-border2 p-[24px] w-full max-w-[400px]">
        <h2 className="text-[15px] font-bold text-text mb-[16px]">
          {t('projects.addMemberTitle')} - {projectName}
        </h2>
        <div className="space-y-[12px]">
          <div>
            <label className="text-[11px] text-text2 font-medium block mb-[4px]">{t('projects.memberLabel')}</label>
            <select
              value={selectedMemberId}
              onChange={(e) => setSelectedMemberId(e.target.value)}
              className="w-full text-[13px] text-text px-[10px] py-[7px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint"
            >
              <option value="">{t('projects.memberSelect')}</option>
              {availableMembers.map((m) => (
                <option key={m.id} value={m.id}>{m.name} ({m.role})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[11px] text-text2 font-medium block mb-[4px]">{t('projects.allocatedHours')}</label>
            <input
              type="number"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              className="w-full text-[13px] text-text px-[10px] py-[7px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint"
              min="0"
              step="1"
            />
          </div>
        </div>
        <div className="flex justify-end gap-[8px] mt-[20px]">
          <button onClick={onClose} className="px-[16px] py-[7px] text-[12px] text-text2 bg-surf2 rounded-[6px] hover:bg-border2 transition-colors">
            {t('common.cancel')}
          </button>
          <button
            onClick={() => onAdd(selectedMemberId, Number(hours) || 0)}
            disabled={saving || !selectedMemberId}
            className="px-[16px] py-[7px] text-[12px] text-white bg-mint rounded-[6px] hover:bg-mint-d transition-colors disabled:opacity-50"
          >
            {saving ? t('projects.adding') : t('common.add')}
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tabs
// ---------------------------------------------------------------------------

const TAB_IDS = ['overview', 'tasks', 'issues', 'members', 'workflow', 'customFields'] as const
type TabId = (typeof TAB_IDS)[number]

const TAB_KEYS: Record<TabId, string> = {
  overview: 'projects.tabOverview',
  tasks: 'projects.tabTasks',
  issues: 'projects.tabIssues',
  members: 'projects.tabMembers',
  workflow: 'projects.tabWorkflow',
  customFields: 'projects.tabCustomFields',
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { t } = useI18n()
  const [activeTab, setActiveTab] = useState<TabId>('overview')
  const [showAddMember, setShowAddMember] = useState(false)
  const [removingMember, setRemovingMember] = useState<ProjectMember | null>(null)
  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState('')

  const { data: project, isLoading: projectLoading } = useProject(params.id)
  const { data: allTasks } = useTasks()
  const { data: allIssues } = useIssues()
  const { data: allProjectMembers } = useProjectMembers()
  const { data: users } = useMembers()
  const addMutation = useAddProjectMember()
  const removeMutation = useRemoveProjectMember()
  const updateProject = useUpdateProject()
  const deleteProject = useDeleteProject()

  // Tasks for this project
  const projectTasks = useMemo(() => {
    if (!allTasks || !params.id) return []
    return allTasks.filter((t) => t.project_id === params.id)
  }, [allTasks, params.id])

  // Issues for this project
  const projectIssues = useMemo(() => {
    if (!allIssues || !params.id) return []
    return allIssues.filter((i) => i.project_id === params.id)
  }, [allIssues, params.id])

  // Project members
  const projectMembers = useMemo(() => {
    if (!allProjectMembers || !project) return []
    return allProjectMembers.filter((m) => m.project_name === project.name)
  }, [allProjectMembers, project])

  // KPI calculations
  const kpis = useMemo(() => {
    const total = projectTasks.length
    const done = projectTasks.filter((t) => t.status === 'done').length
    const completionRate = total > 0 ? Math.round((done / total) * 100) : 0
    const openIssues = projectIssues.filter((i) => i.status === 'open' || i.status === 'in_progress').length
    const criticalIssues = projectIssues.filter((i) => i.severity === 'critical' && i.status !== 'closed').length
    return { total, done, completionRate, openIssues, criticalIssues }
  }, [projectTasks, projectIssues])

  const allUsersList = useMemo(
    () => (users ?? []).map((u) => ({
      id: u.id, name: u.name, name_short: u.name_short, avatar_color: u.avatar_color, role: u.role,
    })),
    [users]
  )

  const existingMemberIds = useMemo(
    () => new Set(projectMembers.map((m) => m.member_id)),
    [projectMembers]
  )

  const currentPm = useMemo(() => {
    if (projectMembers.length === 0) return null
    return projectMembers[0]?.pm ?? null
  }, [projectMembers])

  const handleAddMember = async (memberId: string, allocatedHours: number) => {
    if (!project) return
    const pmId = currentPm?.id ?? users?.find((u) => u.role === 'admin' || u.role === 'director')?.id ?? ''
    if (!pmId) return
    await addMutation.mutateAsync({ projectName: project.name, pmId, memberId, allocatedHours })
    setShowAddMember(false)
  }

  const handleRemoveMember = async () => {
    if (!removingMember) return
    await removeMutation.mutateAsync(removingMember.id)
    setRemovingMember(null)
  }

  const handleUpdateHours = async (id: string, hours: number) => {
    await updateProjectMemberHours(id, hours)
    queryClient.invalidateQueries({ queryKey: ['project-members'] })
  }

  if (projectLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-[13px] text-text3">{t('common.loading')}</div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-[13px] text-text3">{t('projects.notFound')}</div>
      </div>
    )
  }

  const statusConfig = PROJECT_STATUS_STYLES[project.status]

  return (
    <>
      {/* Top bar */}
      <div className="shrink-0 flex items-center gap-3 px-6 py-3 border-b border-wf-border bg-surface">
        <button
          type="button"
          onClick={() => router.push('/projects')}
          className="text-[12px] text-text2 hover:text-mint transition-colors"
        >
          &larr; {t('projects.backToList')}
        </button>
        <span className="text-[10px] font-bold text-mint bg-mint-ll dark:bg-mint-dd/30 px-[7px] py-[2px] rounded-[4px]">
          {project.key_prefix}
        </span>
        {editingName ? (
          <input
            type="text" value={nameDraft} autoFocus
            onChange={(e) => setNameDraft(e.target.value)}
            onBlur={() => {
              if (nameDraft.trim() && nameDraft !== project.name) {
                updateProject.mutate({ id: project.id, data: { name: nameDraft.trim() } })
              }
              setEditingName(false)
            }}
            onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') setEditingName(false) }}
            className="text-[15px] font-bold text-text bg-surface border border-mint rounded-md px-2 py-0.5 focus:outline-none max-w-[300px]"
          />
        ) : (
          <h1
            className="text-[15px] font-bold text-text truncate max-w-[400px] cursor-pointer hover:bg-surf2 rounded px-1 -mx-1 transition-colors"
            onClick={() => { setNameDraft(project.name); setEditingName(true) }}
            title={t('common.edit')}
          >
            {project.name}
          </h1>
        )}
        <span className={`${statusConfig.bg} ${statusConfig.text} ${statusConfig.border} text-[10px] px-[8px] py-[1px] rounded-full font-semibold border`}>
          {t(statusConfig.key)}
        </span>
        <div className="flex-1" />
        <button
          onClick={() => {
            if (window.confirm(`「${project.name}」を削除しますか？`)) {
              deleteProject.mutate(project.id, { onSuccess: () => router.push('/projects') })
            }
          }}
          disabled={deleteProject.isPending}
          className="px-3 py-1.5 rounded-md text-[12px] font-bold border border-danger-b text-danger bg-surface hover:bg-danger-bg transition-colors disabled:opacity-50"
        >
          {t('common.delete')}
        </button>
      </div>

      {/* Tabs */}
      <div className="shrink-0 flex items-center gap-[2px] px-6 bg-surface border-b border-wf-border">
        {TAB_IDS.map((tabId) => (
          <button
            key={tabId}
            onClick={() => setActiveTab(tabId)}
            className={`px-[16px] py-[10px] text-[12.5px] font-semibold border-b-2 transition-colors ${
              activeTab === tabId
                ? 'border-mint text-mint'
                : 'border-transparent text-text2 hover:text-text hover:border-border2'
            }`}
          >
            {t(TAB_KEYS[tabId])}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto p-[20px]">
        {/* ============ Overview tab ============ */}
        {activeTab === 'overview' && (
          <div className="space-y-[16px]">
            {/* Project info card */}
            <div className="bg-surface border border-border2 rounded-[10px] shadow p-[20px]">
              <div className="grid grid-cols-2 gap-[16px]">
                <div>
                  <div className="text-[10.5px] text-text2 mb-[2px]">{t('projects.description')}</div>
                  <textarea
                    defaultValue={project.description ?? ''}
                    onBlur={(e) => {
                      if (e.target.value !== (project.description ?? '')) {
                        updateProject.mutate({ id: project.id, data: { description: e.target.value } })
                      }
                    }}
                    placeholder={t('projects.noDescription')}
                    rows={3}
                    className="w-full text-[12.5px] text-text bg-transparent border-b border-transparent focus:border-mint outline-none resize-y"
                  />
                </div>
                <div className="space-y-[8px]">
                  {project.pm && (
                    <div>
                      <div className="text-[10.5px] text-text2 mb-[2px]">PM</div>
                      <div className="flex items-center gap-[6px]">
                        <Avatar name_short={project.pm.name_short} color={project.pm.avatar_color} avatar_url={project.pm.avatar_url} size="sm" />
                        <span className="text-[12px] text-text">{project.pm.name}</span>
                      </div>
                    </div>
                  )}
                  <div className="flex gap-[16px]">
                    <div>
                      <div className="text-[10.5px] text-text2 mb-[2px]">{t('projects.startDate')}</div>
                      <div className="text-[12px] text-text">{project.start_date ? formatDate(project.start_date) : '-'}</div>
                    </div>
                    <div>
                      <div className="text-[10.5px] text-text2 mb-[2px]">{t('projects.endDate')}</div>
                      <div className="text-[12px] text-text">{project.end_date ? formatDate(project.end_date) : '-'}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* KPI cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-[12px]">
              <KpiCard label={t('projects.taskCount')} value={kpis.total} variant="info" />
              <KpiCard label={t('projects.completionRate')} value={kpis.completionRate} unit="%" variant="mint" />
              <KpiCard label={t('projects.openIssues')} value={kpis.openIssues} variant="warning" />
              <KpiCard label={t('projects.criticalIssues')} value={kpis.criticalIssues} variant="danger" />
            </div>

            {/* Progress */}
            <div className="bg-surface border border-border2 rounded-[10px] shadow p-[16px]">
              <div className="flex items-center justify-between mb-[8px]">
                <span className="text-[12px] font-semibold text-text">{t('projects.progress')}</span>
                <span className="text-[12px] text-text2">{kpis.completionRate}%</span>
              </div>
              <ProgressBar value={kpis.completionRate} height="lg" />
            </div>
          </div>
        )}

        {/* ============ Tasks tab ============ */}
        {activeTab === 'tasks' && (
          <div>
            <div className="flex items-center justify-between mb-[12px]">
              <h3 className="text-[13px] font-bold text-text">{t('projects.tasks')} ({projectTasks.length})</h3>
              <button
                onClick={() => router.push('/tasks/new')}
                className="px-[14px] py-[6px] text-[12px] font-semibold text-white bg-mint rounded-[6px] hover:bg-mint-d transition-colors"
              >
                {t('projects.addTask')}
              </button>
            </div>
            <div className="bg-surface border border-border2 rounded-[10px] shadow overflow-hidden">
              <TaskTable tasks={projectTasks} />
            </div>
          </div>
        )}

        {/* ============ Issues tab ============ */}
        {activeTab === 'issues' && (
          <div>
            <div className="flex items-center justify-between mb-[12px]">
              <h3 className="text-[13px] font-bold text-text">{t('projects.issues')} ({projectIssues.length})</h3>
              <button
                onClick={() => router.push(`/issues/new?project_id=${params.id}`)}
                className="px-[14px] py-[6px] text-[12px] font-semibold text-white bg-mint rounded-[6px] hover:bg-mint-d transition-colors"
              >
                {t('projects.addIssue')}
              </button>
            </div>
            <div className="bg-surface border border-border2 rounded-[10px] shadow overflow-hidden">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-wf-border">
                    <th className="px-[12px] py-[10px] text-[11px] font-semibold text-text2">{t('projects.issueKey')}</th>
                    <th className="px-[12px] py-[10px] text-[11px] font-semibold text-text2">{t('projects.issueType')}</th>
                    <th className="px-[12px] py-[10px] text-[11px] font-semibold text-text2">{t('projects.issueTitle')}</th>
                    <th className="px-[12px] py-[10px] text-[11px] font-semibold text-text2">{t('projects.issueSeverity')}</th>
                    <th className="px-[12px] py-[10px] text-[11px] font-semibold text-text2">{t('projects.issueStatus')}</th>
                    <th className="px-[12px] py-[10px] text-[11px] font-semibold text-text2">{t('projects.issueAssignee')}</th>
                  </tr>
                </thead>
                <tbody>
                  {projectIssues.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-[12px] py-[32px] text-center text-text3 text-[13px]">
                        {t('projects.noIssues')}
                      </td>
                    </tr>
                  )}
                  {projectIssues.map((issue) => (
                    <tr
                      key={issue.id}
                      onClick={() => router.push(`/issues/${issue.id}`)}
                      className="border-b border-wf-border cursor-pointer hover:bg-surf2/50 transition-colors"
                    >
                      <td className="px-[12px] py-[10px] text-[11.5px] font-mono text-mint font-semibold whitespace-nowrap">
                        {issue.issue_key}
                      </td>
                      <td className="px-[12px] py-[10px]">
                        <IssueTypeBadge type={issue.type} size="sm" />
                      </td>
                      <td className="px-[12px] py-[10px] text-[12.5px] font-bold text-text">{issue.title}</td>
                      <td className="px-[12px] py-[10px]">
                        <SeverityBadge severity={issue.severity} size="sm" />
                      </td>
                      <td className="px-[12px] py-[10px]">
                        <IssueStatusBadge status={issue.status} size="sm" />
                      </td>
                      <td className="px-[12px] py-[10px]">
                        {issue.assignee ? (
                          <div className="flex items-center gap-[4px]">
                            <Avatar name_short={issue.assignee.name_short} color={issue.assignee.avatar_color} avatar_url={issue.assignee.avatar_url} size="sm" />
                            <span className="text-[11px] text-text">{issue.assignee.name}</span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-text3">{t('projects.unassigned')}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ============ Workflow tab ============ */}
        {activeTab === 'workflow' && <WorkflowEditor projectId={project.id} />}

        {/* ============ Custom Fields tab ============ */}
        {activeTab === 'customFields' && <CustomFieldManager projectId={project.id} />}

        {/* ============ Members tab ============ */}
        {activeTab === 'members' && (
          <div className="space-y-[16px]">
            <div className="bg-surface border border-border2 rounded-[10px] shadow overflow-hidden">
              <div className="px-[12px] py-[8px] bg-surf2 border-b border-border2 flex items-center justify-between">
                <h3 className="text-[12px] font-bold text-text2">
                  {t('projects.tabMembers')} ({projectMembers.length}{t('projects.memberCount')})
                </h3>
                <button
                  onClick={() => setShowAddMember(true)}
                  className="px-[10px] py-[4px] text-[11px] text-white bg-mint rounded-[5px] hover:bg-mint-d transition-colors font-medium"
                >
                  {t('projects.addMember')}
                </button>
              </div>

              <div className="grid grid-cols-[1fr_100px_80px] gap-[8px] px-[16px] py-[8px] bg-surf2 border-b border-border2 text-[10.5px] font-bold text-text2">
                <div>{t('projects.memberColumn')}</div>
                <div className="text-right">{t('projects.allocatedHoursColumn')}</div>
                <div className="text-center">{t('projects.actionColumn')}</div>
              </div>

              {projectMembers.length === 0 ? (
                <div className="px-[16px] py-[24px] text-center text-[12px] text-text3">
                  {t('projects.noMembers')}
                </div>
              ) : (
                projectMembers.map((pm) => (
                  <div
                    key={pm.id}
                    className="grid grid-cols-[1fr_100px_80px] gap-[8px] px-[16px] py-[8px] border-b border-border2 last:border-b-0 items-center text-[12px] text-text hover:bg-surf2/50 transition-colors"
                  >
                    <div className="flex items-center gap-[8px]">
                      <Avatar name_short={pm.member?.name_short ?? '?'} color={pm.member?.avatar_color ?? 'av-a'} avatar_url={pm.member?.avatar_url} size="sm" />
                      <div className="flex flex-col min-w-0">
                        <span className="text-[12px] font-medium truncate">{pm.member?.name ?? t('projects.unknown')}</span>
                        <span className="text-[10px] text-text3">{pm.member?.role ?? ''}</span>
                      </div>
                    </div>
                    <div className="text-right text-[12px] text-text2">{pm.allocated_hours}h</div>
                    <div className="text-center">
                      <button
                        onClick={() => setRemovingMember(pm)}
                        className="text-[11px] text-danger hover:opacity-80 font-medium transition-colors"
                      >
                        {t('common.delete')}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Add member modal */}
      {showAddMember && project && (
        <AddMemberModal
          projectName={project.name}
          existingMemberIds={existingMemberIds}
          members={allUsersList}
          onClose={() => setShowAddMember(false)}
          onAdd={handleAddMember}
          saving={addMutation.isPending}
        />
      )}

      {/* Remove confirmation */}
      {removingMember && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-surface rounded-[12px] shadow-xl border border-border2 p-[24px] w-full max-w-[380px]">
            <h2 className="text-[15px] font-bold text-text mb-[8px]">{t('projects.removeMemberTitle')}</h2>
            <p className="text-[12px] text-text2 mb-[20px]">
              {removingMember.member?.name ?? t('projects.memberLabel')}{t('projects.removeMemberConfirm')}
            </p>
            <div className="flex justify-end gap-[8px]">
              <button onClick={() => setRemovingMember(null)} className="px-[16px] py-[7px] text-[12px] text-text2 bg-surf2 rounded-[6px] hover:bg-border2 transition-colors">
                {t('common.cancel')}
              </button>
              <button
                onClick={handleRemoveMember}
                disabled={removeMutation.isPending}
                className="px-[16px] py-[7px] text-[12px] text-white bg-danger rounded-[6px] hover:opacity-90 transition-colors disabled:opacity-50"
              >
                {removeMutation.isPending ? t('projects.removing') : t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
