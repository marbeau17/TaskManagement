'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Topbar } from '@/components/layout'
import { Avatar, ProgressBar, FilterBar, Pagination } from '@/components/shared'
import { useProjects, useCreateProject, useUpdateProject } from '@/hooks/useProjects'
import { useMembers } from '@/hooks/useMembers'
import { useTasks } from '@/hooks/useTasks'
import { useIssues } from '@/hooks/useIssues'
import { useDebounce } from '@/hooks/useDebounce'
import { usePermission } from '@/hooks/usePermission'
import { useI18n } from '@/hooks/useI18n'
import type { Project, ProjectStatus } from '@/types/project'

// ---------------------------------------------------------------------------
// Project status styles
// ---------------------------------------------------------------------------

const PROJECT_STATUS_STYLES: Record<
  ProjectStatus,
  { key: string; bg: string; text: string; border: string }
> = {
  planning: {
    key: 'projects.statusPlanning',
    bg: 'bg-slate-100 dark:bg-slate-800',
    text: 'text-slate-600 dark:text-slate-300',
    border: 'border-slate-300 dark:border-slate-600',
  },
  active: {
    key: 'projects.statusActive',
    bg: 'bg-emerald-100 dark:bg-emerald-950/40',
    text: 'text-emerald-700 dark:text-emerald-400',
    border: 'border-emerald-300 dark:border-emerald-800',
  },
  on_hold: {
    key: 'projects.statusOnHold',
    bg: 'bg-amber-100 dark:bg-amber-950/40',
    text: 'text-amber-700 dark:text-amber-400',
    border: 'border-amber-300 dark:border-amber-800',
  },
  completed: {
    key: 'projects.statusCompleted',
    bg: 'bg-blue-100 dark:bg-blue-950/40',
    text: 'text-blue-700 dark:text-blue-400',
    border: 'border-blue-300 dark:border-blue-800',
  },
  archived: {
    key: 'projects.statusArchived',
    bg: 'bg-gray-200 dark:bg-gray-800',
    text: 'text-gray-600 dark:text-gray-400',
    border: 'border-gray-400 dark:border-gray-600',
  },
}

function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  const { t } = useI18n()
  const config = PROJECT_STATUS_STYLES[status]
  return (
    <span
      className={`${config.bg} ${config.text} ${config.border} text-[10px] px-[8px] py-[1px] rounded-full font-semibold border inline-block whitespace-nowrap`}
    >
      {t(config.key)}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Create Project Modal
// ---------------------------------------------------------------------------

function CreateProjectModal({
  members,
  onClose,
  onSubmit,
  saving,
}: {
  members: { id: string; name: string; role: string }[]
  onClose: () => void
  onSubmit: (data: {
    name: string
    description: string
    key_prefix: string
    pm_id: string | null
    status: ProjectStatus
    start_date: string | null
    end_date: string | null
  }) => void
  saving: boolean
}) {
  const { t } = useI18n()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [keyPrefix, setKeyPrefix] = useState('')
  const [pmId, setPmId] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const directorsAndAdmins = members.filter(
    (m) => m.role === 'admin' || m.role === 'director'
  )

  const handleSubmit = () => {
    if (!name.trim() || !keyPrefix.trim()) return
    onSubmit({
      name: name.trim(),
      description: description.trim(),
      key_prefix: keyPrefix.trim().toUpperCase(),
      pm_id: pmId || null,
      status: 'planning',
      start_date: startDate || null,
      end_date: endDate || null,
    })
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-3 md:p-0">
      <div className="bg-surface rounded-[12px] shadow-xl border border-border2 p-[16px] md:p-[24px] w-full max-w-[460px] max-h-[90vh] overflow-y-auto">
        <h2 className="text-[15px] font-bold text-text mb-[16px]">
          {t('projects.createTitle')}
        </h2>

        <div className="space-y-[12px]">
          <div>
            <label className="text-[11px] text-text2 font-medium block mb-[4px]">
              {t('projects.name')} <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('projects.namePlaceholder')}
              className="w-full text-[13px] text-text px-[10px] py-[7px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint placeholder:text-text3"
            />
          </div>

          <div>
            <label className="text-[11px] text-text2 font-medium block mb-[4px]">
              {t('projects.description')}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder={t('projects.descriptionPlaceholder')}
              className="w-full text-[13px] text-text px-[10px] py-[7px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint placeholder:text-text3 resize-y"
            />
          </div>

          <div>
            <label className="text-[11px] text-text2 font-medium block mb-[4px]">
              {t('projects.keyPrefix')} <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              value={keyPrefix}
              onChange={(e) => setKeyPrefix(e.target.value.toUpperCase())}
              placeholder={t('projects.keyPrefixPlaceholder')}
              maxLength={10}
              className="w-full text-[13px] text-text px-[10px] py-[7px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint placeholder:text-text3 uppercase"
            />
            <p className="text-[10px] text-text3 mt-[2px]">
              {t('projects.keyPrefixHint')}
            </p>
          </div>

          <div>
            <label className="text-[11px] text-text2 font-medium block mb-[4px]">
              {t('projects.pm')}
            </label>
            <select
              value={pmId}
              onChange={(e) => setPmId(e.target.value)}
              className="w-full text-[13px] text-text px-[10px] py-[7px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint"
            >
              <option value="">{t('projects.pmNotSet')}</option>
              {directorsAndAdmins.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-[10px]">
            <div>
              <label className="text-[11px] text-text2 font-medium block mb-[4px]">
                {t('projects.startDate')}
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full text-[13px] text-text px-[10px] py-[7px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint"
              />
            </div>
            <div>
              <label className="text-[11px] text-text2 font-medium block mb-[4px]">
                {t('projects.endDate')}
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full text-[13px] text-text px-[10px] py-[7px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-[8px] mt-[20px]">
          <button
            onClick={onClose}
            className="px-[16px] py-[7px] text-[12px] text-text2 bg-surf2 rounded-[6px] hover:bg-border2 transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !name.trim() || !keyPrefix.trim()}
            className="px-[16px] py-[7px] text-[12px] text-white bg-mint rounded-[6px] hover:bg-mint-d transition-colors disabled:opacity-50"
          >
            {saving ? t('projects.creating') : t('projects.createBtn')}
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function ProjectsPage() {
  const router = useRouter()
  const { t } = useI18n()
  const { can } = usePermission()
  const [statusFilter, setStatusFilter] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const search = useDebounce(searchInput, 300)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  const { data: projects, isLoading } = useProjects()
  const { data: members } = useMembers()
  const { data: allTasks } = useTasks()
  const { data: allIssues } = useIssues()
  const createProjectMutation = useCreateProject()
  const updateProjectMutation = useUpdateProject()
  const [editingProject, setEditingProject] = useState<{ id: string; field: string } | null>(null)
  const [editDraft, setEditDraft] = useState('')

  // Filter projects
  const filteredProjects = useMemo(() => {
    if (!projects) return []
    let result = [...projects]

    if (statusFilter) {
      result = result.filter((p) => p.status === statusFilter)
    }
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.key_prefix.toLowerCase().includes(q)
      )
    }

    return result
  }, [projects, statusFilter, search])

  const paginatedProjects = useMemo(() => {
    if (pageSize === 0) return filteredProjects
    const start = (currentPage - 1) * pageSize
    return filteredProjects.slice(start, start + pageSize)
  }, [filteredProjects, currentPage, pageSize])

  // Compute task/issue counts per project
  const projectStats = useMemo(() => {
    const stats: Record<string, { taskCount: number; doneCount: number; issueCount: number }> = {}
    if (allTasks) {
      for (const task of allTasks) {
        if (!task.project_id) continue
        if (!stats[task.project_id]) {
          stats[task.project_id] = { taskCount: 0, doneCount: 0, issueCount: 0 }
        }
        stats[task.project_id].taskCount++
        if (task.status === 'done') stats[task.project_id].doneCount++
      }
    }
    if (allIssues) {
      for (const issue of allIssues) {
        if (!stats[issue.project_id]) {
          stats[issue.project_id] = { taskCount: 0, doneCount: 0, issueCount: 0 }
        }
        stats[issue.project_id].issueCount++
      }
    }
    return stats
  }, [allTasks, allIssues])

  const membersList = useMemo(
    () =>
      (members ?? []).map((m) => ({
        id: m.id,
        name: m.name,
        name_short: m.name_short,
        avatar_color: m.avatar_color,
        role: m.role,
      })),
    [members]
  )

  const handleCreateProject = async (data: Parameters<typeof createProjectMutation.mutateAsync>[0]) => {
    await createProjectMutation.mutateAsync(data)
    setShowCreateModal(false)
  }

  return (
    <>
      <Topbar title={t('projects.title')}>
        {can('projects', 'create') && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-[14px] py-[6px] text-[12px] font-semibold text-white bg-mint rounded-[6px] hover:bg-mint-d transition-colors"
          >
            {t('projects.create')}
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
                label: t('projects.status'),
                value: statusFilter,
                options: [
                  { label: t('projects.statusPlanning'), value: 'planning' },
                  { label: t('projects.statusActive'), value: 'active' },
                  { label: t('projects.statusOnHold'), value: 'on_hold' },
                  { label: t('projects.statusCompleted'), value: 'completed' },
                  { label: t('projects.statusArchived'), value: 'archived' },
                ],
                onChange: setStatusFilter,
              },
            ]}
          />
        </div>

        <div className="mb-[12px]">
          <Pagination
            page={currentPage}
            pageSize={pageSize}
            totalCount={filteredProjects.length}
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

        {/* Empty */}
        {!isLoading && filteredProjects.length === 0 && (
          <div className="text-center py-[40px] text-[13px] text-text3">
            {t('projects.notFound')}
          </div>
        )}

        {/* Project grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-[16px]">
          {paginatedProjects.map((project) => {
            const stats = projectStats[project.id] ?? { taskCount: 0, doneCount: 0, issueCount: 0 }
            const completionRate = stats.taskCount > 0
              ? Math.round((stats.doneCount / stats.taskCount) * 100)
              : 0

            return (
              <button
                key={project.id}
                onClick={() => { if (!editingProject) router.push(`/projects/${project.id}`) }}
                className="bg-surface border border-border2 rounded-[10px] shadow p-[16px] text-left hover:border-mint transition-colors group"
              >
                {/* Header row */}
                <div className="flex items-start justify-between mb-[8px]">
                  <div className="flex items-center gap-[8px] min-w-0">
                    <span className="text-[10px] font-bold text-mint bg-mint-ll dark:bg-mint-dd/30 px-[7px] py-[2px] rounded-[4px] shrink-0">
                      {project.key_prefix}
                    </span>
                    {editingProject?.id === project.id && editingProject.field === 'name' ? (
                      <input
                        type="text"
                        value={editDraft}
                        onChange={(e) => setEditDraft(e.target.value)}
                        onBlur={() => {
                          if (editDraft.trim() && editDraft.trim() !== project.name) {
                            updateProjectMutation.mutate({ id: project.id, data: { name: editDraft.trim() } })
                          }
                          setEditingProject(null)
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                          if (e.key === 'Escape') setEditingProject(null)
                        }}
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                        className="text-[14px] font-bold text-text bg-surface border border-mint rounded px-1 py-0.5 w-full focus:outline-none"
                      />
                    ) : (
                      <h3
                        className="text-[14px] font-bold text-text truncate group-hover:text-mint transition-colors"
                        onDoubleClick={(e) => {
                          e.stopPropagation()
                          e.preventDefault()
                          setEditDraft(project.name)
                          setEditingProject({ id: project.id, field: 'name' })
                        }}
                      >
                        {project.name}
                      </h3>
                    )}
                  </div>
                  {editingProject?.id === project.id && editingProject.field === 'status' ? (
                    <select
                      value={editDraft}
                      onChange={(e) => {
                        updateProjectMutation.mutate({ id: project.id, data: { status: e.target.value as ProjectStatus } })
                        setEditingProject(null)
                      }}
                      onBlur={() => setEditingProject(null)}
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                      className="text-[10px] bg-surface border border-mint rounded px-1 py-0.5 focus:outline-none"
                    >
                      <option value="planning">{t('projects.statusPlanning')}</option>
                      <option value="active">{t('projects.statusActive')}</option>
                      <option value="on_hold">{t('projects.statusOnHold')}</option>
                      <option value="completed">{t('projects.statusCompleted')}</option>
                      <option value="archived">{t('projects.statusArchived')}</option>
                    </select>
                  ) : (
                    <span onDoubleClick={(e) => {
                      e.stopPropagation()
                      e.preventDefault()
                      setEditDraft(project.status)
                      setEditingProject({ id: project.id, field: 'status' })
                    }}>
                      <ProjectStatusBadge status={project.status} />
                    </span>
                  )}
                </div>

                {/* Description */}
                {editingProject?.id === project.id && editingProject.field === 'description' ? (
                  <textarea
                    value={editDraft}
                    onChange={(e) => setEditDraft(e.target.value)}
                    onBlur={() => {
                      if (editDraft !== (project.description ?? '')) {
                        updateProjectMutation.mutate({ id: project.id, data: { description: editDraft } })
                      }
                      setEditingProject(null)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') setEditingProject(null)
                    }}
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                    rows={2}
                    className="text-[11px] text-text bg-surface border border-mint rounded px-1 py-0.5 w-full focus:outline-none resize-none mb-[10px]"
                  />
                ) : project.description ? (
                  <p
                    className="text-[11px] text-text2 line-clamp-2 mb-[10px]"
                    onDoubleClick={(e) => {
                      e.stopPropagation()
                      e.preventDefault()
                      setEditDraft(project.description ?? '')
                      setEditingProject({ id: project.id, field: 'description' })
                    }}
                  >
                    {project.description}
                  </p>
                ) : null}

                {/* PM info */}
                {project.pm && (
                  <div className="flex items-center gap-[6px] mb-[10px]">
                    <Avatar
                      name_short={project.pm.name_short}
                      color={project.pm.avatar_color}
                      size="sm"
                    />
                    <span className="text-[11px] text-text">
                      {project.pm.name}
                    </span>
                    <span className="text-[10px] text-text3">PM</span>
                  </div>
                )}

                {/* Stats row */}
                <div className="flex items-center gap-[16px] mb-[8px]">
                  <span className="text-[11px] text-text2">
                    {t('projects.tasks')} <span className="font-semibold text-text">{stats.taskCount}</span>
                  </span>
                  <span className="text-[11px] text-text2">
                    {t('projects.issues')} <span className="font-semibold text-text">{stats.issueCount}</span>
                  </span>
                  <span className="text-[11px] text-text2 ml-auto">
                    {completionRate}%
                  </span>
                </div>

                {/* Progress bar */}
                <ProgressBar value={completionRate} height="sm" />
              </button>
            )
          })}
        </div>
      </div>

      {/* Create project modal */}
      {showCreateModal && (
        <CreateProjectModal
          members={membersList}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateProject}
          saving={createProjectMutation.isPending}
        />
      )}
    </>
  )
}
