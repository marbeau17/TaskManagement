'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Topbar } from '@/components/layout'
import { Avatar, ProgressBar, FilterBar } from '@/components/shared'
import { useProjects, useCreateProject } from '@/hooks/useProjects'
import { useMembers } from '@/hooks/useMembers'
import { useTasks } from '@/hooks/useTasks'
import { useIssues } from '@/hooks/useIssues'
import { usePermission } from '@/hooks/usePermission'
import type { Project, ProjectStatus } from '@/types/project'

// ---------------------------------------------------------------------------
// Project status styles
// ---------------------------------------------------------------------------

const PROJECT_STATUS_CONFIG: Record<
  ProjectStatus,
  { label: string; bg: string; text: string; border: string }
> = {
  planning: {
    label: '\u8A08\u753B\u4E2D',
    bg: 'bg-slate-100 dark:bg-slate-800',
    text: 'text-slate-600 dark:text-slate-300',
    border: 'border-slate-300 dark:border-slate-600',
  },
  active: {
    label: '\u9032\u884C\u4E2D',
    bg: 'bg-emerald-100 dark:bg-emerald-950/40',
    text: 'text-emerald-700 dark:text-emerald-400',
    border: 'border-emerald-300 dark:border-emerald-800',
  },
  on_hold: {
    label: '\u4FDD\u7559',
    bg: 'bg-amber-100 dark:bg-amber-950/40',
    text: 'text-amber-700 dark:text-amber-400',
    border: 'border-amber-300 dark:border-amber-800',
  },
  completed: {
    label: '\u5B8C\u4E86',
    bg: 'bg-blue-100 dark:bg-blue-950/40',
    text: 'text-blue-700 dark:text-blue-400',
    border: 'border-blue-300 dark:border-blue-800',
  },
  archived: {
    label: '\u30A2\u30FC\u30AB\u30A4\u30D6',
    bg: 'bg-gray-200 dark:bg-gray-800',
    text: 'text-gray-600 dark:text-gray-400',
    border: 'border-gray-400 dark:border-gray-600',
  },
}

function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  const config = PROJECT_STATUS_CONFIG[status]
  return (
    <span
      className={`${config.bg} ${config.text} ${config.border} text-[10px] px-[8px] py-[1px] rounded-full font-semibold border inline-block whitespace-nowrap`}
    >
      {config.label}
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
          プロジェクト作成
        </h2>

        <div className="space-y-[12px]">
          <div>
            <label className="text-[11px] text-text2 font-medium block mb-[4px]">
              プロジェクト名 <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例: Webリニューアルプロジェクト"
              className="w-full text-[13px] text-text px-[10px] py-[7px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint placeholder:text-text3"
            />
          </div>

          <div>
            <label className="text-[11px] text-text2 font-medium block mb-[4px]">
              説明
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="プロジェクトの概要"
              className="w-full text-[13px] text-text px-[10px] py-[7px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint placeholder:text-text3 resize-y"
            />
          </div>

          <div>
            <label className="text-[11px] text-text2 font-medium block mb-[4px]">
              キープレフィックス <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              value={keyPrefix}
              onChange={(e) => setKeyPrefix(e.target.value.toUpperCase())}
              placeholder="例: WEB"
              maxLength={10}
              className="w-full text-[13px] text-text px-[10px] py-[7px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint placeholder:text-text3 uppercase"
            />
            <p className="text-[10px] text-text3 mt-[2px]">
              課題キーに使用されます (例: WEB-1, WEB-2)
            </p>
          </div>

          <div>
            <label className="text-[11px] text-text2 font-medium block mb-[4px]">
              PM (プロジェクトマネージャー)
            </label>
            <select
              value={pmId}
              onChange={(e) => setPmId(e.target.value)}
              className="w-full text-[13px] text-text px-[10px] py-[7px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint"
            >
              <option value="">未設定</option>
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
                開始日
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
                終了日
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
            キャンセル
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !name.trim() || !keyPrefix.trim()}
            className="px-[16px] py-[7px] text-[12px] text-white bg-mint rounded-[6px] hover:bg-mint-d transition-colors disabled:opacity-50"
          >
            {saving ? '作成中...' : '作成'}
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
  const { can } = usePermission()
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)

  const { data: projects, isLoading } = useProjects()
  const { data: members } = useMembers()
  const { data: allTasks } = useTasks()
  const { data: allIssues } = useIssues()
  const createProjectMutation = useCreateProject()

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
      <Topbar title="プロジェクト管理">
        {can('projects', 'create') && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-[14px] py-[6px] text-[12px] font-semibold text-white bg-mint rounded-[6px] hover:bg-mint-d transition-colors"
          >
            + プロジェクト作成
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
                label: 'ステータス',
                value: statusFilter,
                options: [
                  { label: '計画中', value: 'planning' },
                  { label: '進行中', value: 'active' },
                  { label: '保留', value: 'on_hold' },
                  { label: '完了', value: 'completed' },
                  { label: 'アーカイブ', value: 'archived' },
                ],
                onChange: setStatusFilter,
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

        {/* Empty */}
        {!isLoading && filteredProjects.length === 0 && (
          <div className="text-center py-[40px] text-[13px] text-text3">
            プロジェクトが見つかりません
          </div>
        )}

        {/* Project grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-[16px]">
          {filteredProjects.map((project) => {
            const stats = projectStats[project.id] ?? { taskCount: 0, doneCount: 0, issueCount: 0 }
            const completionRate = stats.taskCount > 0
              ? Math.round((stats.doneCount / stats.taskCount) * 100)
              : 0

            return (
              <button
                key={project.id}
                onClick={() => router.push(`/projects/${project.id}`)}
                className="bg-surface border border-border2 rounded-[10px] shadow p-[16px] text-left hover:border-mint transition-colors group"
              >
                {/* Header row */}
                <div className="flex items-start justify-between mb-[8px]">
                  <div className="flex items-center gap-[8px] min-w-0">
                    <span className="text-[10px] font-bold text-mint bg-mint-ll dark:bg-mint-dd/30 px-[7px] py-[2px] rounded-[4px] shrink-0">
                      {project.key_prefix}
                    </span>
                    <h3 className="text-[14px] font-bold text-text truncate group-hover:text-mint transition-colors">
                      {project.name}
                    </h3>
                  </div>
                  <ProjectStatusBadge status={project.status} />
                </div>

                {/* Description */}
                {project.description && (
                  <p className="text-[11px] text-text2 line-clamp-2 mb-[10px]">
                    {project.description}
                  </p>
                )}

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
                    タスク <span className="font-semibold text-text">{stats.taskCount}</span>
                  </span>
                  <span className="text-[11px] text-text2">
                    課題 <span className="font-semibold text-text">{stats.issueCount}</span>
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
