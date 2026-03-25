'use client'

import { useState, useMemo } from 'react'
import { Topbar } from '@/components/layout'
import { Avatar } from '@/components/shared'
import {
  useProjectMembers,
  useAddProjectMember,
  useRemoveProjectMember,
} from '@/hooks/useProjects'
import { updateProjectMemberHours } from '@/lib/data/projects'
import { useMembers } from '@/hooks/useMembers'
import { useQueryClient } from '@tanstack/react-query'
import type { ProjectMember } from '@/types/database'

// ---------------------------------------------------------------------------
// Add member modal
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
  const [selectedMemberId, setSelectedMemberId] = useState('')
  const [hours, setHours] = useState('40')

  const availableMembers = members.filter((m) => !existingMemberIds.has(m.id))

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-surface rounded-[12px] shadow-xl border border-border2 p-[24px] w-[400px]">
        <h2 className="text-[15px] font-bold text-text mb-[16px]">
          メンバー追加 - {projectName}
        </h2>

        <div className="space-y-[12px]">
          <div>
            <label className="text-[11px] text-text2 font-medium block mb-[4px]">
              メンバー
            </label>
            <select
              value={selectedMemberId}
              onChange={(e) => setSelectedMemberId(e.target.value)}
              className="w-full text-[13px] text-text px-[10px] py-[7px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint"
            >
              <option value="">選択してください</option>
              {availableMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.role})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] text-text2 font-medium block mb-[4px]">
              割当時間 (h/月)
            </label>
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
          <button
            onClick={onClose}
            className="px-[16px] py-[7px] text-[12px] text-text2 bg-surf2 rounded-[6px] hover:bg-border2 transition-colors"
          >
            キャンセル
          </button>
          <button
            onClick={() => onAdd(selectedMemberId, Number(hours) || 0)}
            disabled={saving || !selectedMemberId}
            className="px-[16px] py-[7px] text-[12px] text-white bg-mint rounded-[6px] hover:bg-mint-d transition-colors disabled:opacity-50"
          >
            {saving ? '追加中...' : '追加'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Remove confirmation dialog
// ---------------------------------------------------------------------------

function RemoveConfirmDialog({
  member,
  onClose,
  onConfirm,
  removing,
}: {
  member: ProjectMember
  onClose: () => void
  onConfirm: () => void
  removing: boolean
}) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-surface rounded-[12px] shadow-xl border border-border2 p-[24px] w-[380px]">
        <h2 className="text-[15px] font-bold text-text mb-[8px]">
          メンバー削除
        </h2>
        <p className="text-[12px] text-text2 mb-[20px]">
          「{member.member?.name ?? 'メンバー'}」をプロジェクトから削除しますか？
        </p>

        <div className="flex justify-end gap-[8px]">
          <button
            onClick={onClose}
            className="px-[16px] py-[7px] text-[12px] text-text2 bg-surf2 rounded-[6px] hover:bg-border2 transition-colors"
          >
            キャンセル
          </button>
          <button
            onClick={onConfirm}
            disabled={removing}
            className="px-[16px] py-[7px] text-[12px] text-white bg-danger rounded-[6px] hover:opacity-90 transition-colors disabled:opacity-50"
          >
            {removing ? '削除中...' : '削除'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Inline editable hours cell
// ---------------------------------------------------------------------------

function EditableHours({
  value,
  onSave,
}: {
  value: number
  onSave: (newVal: number) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(String(value))

  if (!editing) {
    return (
      <button
        onClick={() => {
          setDraft(String(value))
          setEditing(true)
        }}
        className="text-[12px] text-mint hover:text-mint-d font-medium transition-colors cursor-pointer"
        title="クリックして編集"
      >
        {value}h
      </button>
    )
  }

  return (
    <input
      type="number"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        const num = Number(draft)
        if (!isNaN(num) && num >= 0) onSave(num)
        setEditing(false)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          const num = Number(draft)
          if (!isNaN(num) && num >= 0) onSave(num)
          setEditing(false)
        }
        if (e.key === 'Escape') setEditing(false)
      }}
      className="w-[60px] text-[12px] text-text px-[4px] py-[2px] bg-surface border border-mint rounded-[4px] outline-none text-center"
      min="0"
      autoFocus
    />
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function ProjectsPage() {
  const { data: allMembers, isLoading: membersLoading } = useProjectMembers()
  const { data: users } = useMembers()
  const addMutation = useAddProjectMember()
  const removeMutation = useRemoveProjectMember()
  const queryClient = useQueryClient()

  const [newProjectName, setNewProjectName] = useState('')
  const [selectedProject, setSelectedProject] = useState<string | null>(null)
  const [showAddMember, setShowAddMember] = useState(false)
  const [removingMember, setRemovingMember] = useState<ProjectMember | null>(null)
  const [pmSelectProject, setPmSelectProject] = useState<string | null>(null)
  const [selectedPmId, setSelectedPmId] = useState('')

  // Derive unique project names
  const projectNames = useMemo(() => {
    if (!allMembers) return []
    const names = new Set(allMembers.map((m) => m.project_name))
    return Array.from(names).sort((a, b) => a.localeCompare(b, 'ja'))
  }, [allMembers])

  // Members for selected project
  const projectMembers = useMemo(() => {
    if (!allMembers || !selectedProject) return []
    return allMembers.filter((m) => m.project_name === selectedProject)
  }, [allMembers, selectedProject])

  // Current PM for selected project
  const currentPm = useMemo(() => {
    if (projectMembers.length === 0) return null
    return projectMembers[0]?.pm ?? null
  }, [projectMembers])

  // Create new project (by adding a placeholder member)
  const handleCreateProject = () => {
    const name = newProjectName.trim()
    if (!name) return
    // Select the project, user will add members
    setSelectedProject(name)
    setNewProjectName('')
  }

  const handleAddMember = async (memberId: string, allocatedHours: number) => {
    if (!selectedProject) return
    // Use PM from current project, or the first admin/director
    const pmId = currentPm?.id ?? users?.find((u) => u.role === 'admin' || u.role === 'director')?.id ?? ''
    if (!pmId) return
    await addMutation.mutateAsync({
      projectName: selectedProject,
      pmId,
      memberId,
      allocatedHours,
    })
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

  const handleSetPm = async (projectName: string, newPmId: string) => {
    if (!allMembers) return
    // Update all members of this project to use the new PM
    const members = allMembers.filter((m) => m.project_name === projectName)
    for (const member of members) {
      await removeMutation.mutateAsync(member.id)
      await addMutation.mutateAsync({
        projectName,
        pmId: newPmId,
        memberId: member.member_id,
        allocatedHours: member.allocated_hours,
      })
    }
    setPmSelectProject(null)
    setSelectedPmId('')
  }

  const existingMemberIds = useMemo(
    () => new Set(projectMembers.map((m) => m.member_id)),
    [projectMembers]
  )

  const allUsersList = useMemo(
    () =>
      (users ?? []).map((u) => ({
        id: u.id,
        name: u.name,
        name_short: u.name_short,
        avatar_color: u.avatar_color,
        role: u.role,
      })),
    [users]
  )

  const directorsAndAdmins = useMemo(
    () => (users ?? []).filter((u) => u.role === 'admin' || u.role === 'director'),
    [users]
  )

  return (
    <>
      <Topbar title="プロジェクト管理" />

      <div className="flex-1 overflow-auto p-[20px]">
        <div className="flex gap-[20px]">
          {/* Left: Project list */}
          <div className="w-[300px] shrink-0">
            <div className="bg-surface border border-border2 rounded-[10px] shadow overflow-hidden">
              {/* Header */}
              <div className="px-[12px] py-[10px] bg-surf2 border-b border-border2">
                <h3 className="text-[13px] font-bold text-text">プロジェクト一覧</h3>
              </div>

              {/* New project input */}
              <div className="px-[12px] py-[10px] border-b border-border2">
                <div className="flex gap-[6px]">
                  <input
                    type="text"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="新しいプロジェクト名"
                    className="flex-1 text-[12px] text-text px-[8px] py-[5px] bg-surface border border-border2 rounded-[5px] outline-none focus:border-mint placeholder:text-text3"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCreateProject()
                    }}
                  />
                  <button
                    onClick={handleCreateProject}
                    disabled={!newProjectName.trim()}
                    className="px-[10px] py-[5px] text-[11px] text-white bg-mint rounded-[5px] hover:bg-mint-d transition-colors disabled:opacity-50 whitespace-nowrap"
                  >
                    追加
                  </button>
                </div>
              </div>

              {/* Project items */}
              {membersLoading ? (
                <div className="px-[12px] py-[20px] text-center text-[12px] text-text3">
                  読み込み中...
                </div>
              ) : projectNames.length === 0 ? (
                <div className="px-[12px] py-[20px] text-center text-[12px] text-text3">
                  プロジェクトがありません
                </div>
              ) : (
                projectNames.map((name) => {
                  const isSelected = selectedProject === name
                  const count = allMembers?.filter((m) => m.project_name === name).length ?? 0
                  return (
                    <button
                      key={name}
                      onClick={() => setSelectedProject(name)}
                      className={`w-full text-left px-[12px] py-[8px] border-b border-border2 last:border-b-0 transition-colors ${
                        isSelected
                          ? 'bg-mint-ll dark:bg-accent text-text font-semibold'
                          : 'text-text hover:bg-surf2/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[12px] truncate">{name}</span>
                        <span className="text-[10px] text-text3 bg-surf2 px-[6px] py-[1px] rounded-full">
                          {count}名
                        </span>
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </div>

          {/* Right: Project details */}
          <div className="flex-1 min-w-0">
            {!selectedProject ? (
              <div className="bg-surface border border-border2 rounded-[10px] shadow p-[32px] text-center text-[12px] text-text3">
                左のリストからプロジェクトを選択してください
              </div>
            ) : (
              <div className="space-y-[16px]">
                {/* Project name header */}
                <div className="bg-surface border border-border2 rounded-[10px] shadow px-[16px] py-[12px]">
                  <h2 className="text-[16px] font-bold text-text">{selectedProject}</h2>
                </div>

                {/* PM section */}
                <div className="bg-surface border border-border2 rounded-[10px] shadow overflow-hidden">
                  <div className="px-[12px] py-[8px] bg-surf2 border-b border-border2 flex items-center justify-between">
                    <h3 className="text-[12px] font-bold text-text2">PM (プロジェクトマネージャー)</h3>
                    <button
                      onClick={() => {
                        setPmSelectProject(selectedProject)
                        setSelectedPmId(currentPm?.id ?? '')
                      }}
                      className="text-[11px] text-mint hover:text-mint-d font-medium transition-colors"
                    >
                      変更
                    </button>
                  </div>
                  <div className="px-[12px] py-[10px]">
                    {currentPm ? (
                      <div className="flex items-center gap-[8px]">
                        <Avatar
                          name_short={currentPm.name_short}
                          color={currentPm.avatar_color}
                          size="sm"
                        />
                        <span className="text-[12px] text-text font-medium">{currentPm.name}</span>
                        <span className="text-[10px] text-text3">({currentPm.role})</span>
                      </div>
                    ) : (
                      <span className="text-[12px] text-text3">未設定</span>
                    )}
                  </div>
                </div>

                {/* PM selection modal */}
                {pmSelectProject && (
                  <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                    <div className="bg-surface rounded-[12px] shadow-xl border border-border2 p-[24px] w-[380px]">
                      <h2 className="text-[15px] font-bold text-text mb-[16px]">PM変更</h2>
                      <select
                        value={selectedPmId}
                        onChange={(e) => setSelectedPmId(e.target.value)}
                        className="w-full text-[13px] text-text px-[10px] py-[7px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint mb-[16px]"
                      >
                        <option value="">選択してください</option>
                        {directorsAndAdmins.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name} ({u.role})
                          </option>
                        ))}
                      </select>
                      <div className="flex justify-end gap-[8px]">
                        <button
                          onClick={() => setPmSelectProject(null)}
                          className="px-[16px] py-[7px] text-[12px] text-text2 bg-surf2 rounded-[6px] hover:bg-border2 transition-colors"
                        >
                          キャンセル
                        </button>
                        <button
                          onClick={() => handleSetPm(pmSelectProject, selectedPmId)}
                          disabled={!selectedPmId}
                          className="px-[16px] py-[7px] text-[12px] text-white bg-mint rounded-[6px] hover:bg-mint-d transition-colors disabled:opacity-50"
                        >
                          設定
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Members table */}
                <div className="bg-surface border border-border2 rounded-[10px] shadow overflow-hidden">
                  <div className="px-[12px] py-[8px] bg-surf2 border-b border-border2 flex items-center justify-between">
                    <h3 className="text-[12px] font-bold text-text2">
                      メンバー ({projectMembers.length}名)
                    </h3>
                    <button
                      onClick={() => setShowAddMember(true)}
                      className="px-[10px] py-[4px] text-[11px] text-white bg-mint rounded-[5px] hover:bg-mint-d transition-colors font-medium"
                    >
                      + メンバー追加
                    </button>
                  </div>

                  {/* Table header */}
                  <div className="grid grid-cols-[1fr_100px_80px] gap-[8px] px-[16px] py-[8px] bg-surf2 border-b border-border2 text-[10.5px] font-bold text-text2">
                    <div>メンバー</div>
                    <div className="text-right">割当時間</div>
                    <div className="text-center">操作</div>
                  </div>

                  {/* Table rows */}
                  {projectMembers.length === 0 ? (
                    <div className="px-[16px] py-[24px] text-center text-[12px] text-text3">
                      メンバーがいません。「+ メンバー追加」で追加してください。
                    </div>
                  ) : (
                    projectMembers.map((pm) => (
                      <div
                        key={pm.id}
                        className="grid grid-cols-[1fr_100px_80px] gap-[8px] px-[16px] py-[8px] border-b border-border2 last:border-b-0 items-center text-[12px] text-text hover:bg-surf2/50 transition-colors"
                      >
                        {/* Member info */}
                        <div className="flex items-center gap-[8px]">
                          <Avatar
                            name_short={pm.member?.name_short ?? '?'}
                            color={pm.member?.avatar_color ?? 'av-a'}
                            size="sm"
                          />
                          <div className="flex flex-col min-w-0">
                            <span className="text-[12px] font-medium truncate">
                              {pm.member?.name ?? '不明'}
                            </span>
                            <span className="text-[10px] text-text3">
                              {pm.member?.role ?? ''}
                            </span>
                          </div>
                        </div>

                        {/* Allocated hours (editable) */}
                        <div className="text-right">
                          <EditableHours
                            value={pm.allocated_hours}
                            onSave={(h) => handleUpdateHours(pm.id, h)}
                          />
                        </div>

                        {/* Remove button */}
                        <div className="text-center">
                          <button
                            onClick={() => setRemovingMember(pm)}
                            className="text-[11px] text-danger hover:opacity-80 font-medium transition-colors"
                          >
                            削除
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add member modal */}
      {showAddMember && selectedProject && (
        <AddMemberModal
          projectName={selectedProject}
          existingMemberIds={existingMemberIds}
          members={allUsersList}
          onClose={() => setShowAddMember(false)}
          onAdd={handleAddMember}
          saving={addMutation.isPending}
        />
      )}

      {/* Remove member confirmation */}
      {removingMember && (
        <RemoveConfirmDialog
          member={removingMember}
          onClose={() => setRemovingMember(null)}
          onConfirm={handleRemoveMember}
          removing={removeMutation.isPending}
        />
      )}
    </>
  )
}
