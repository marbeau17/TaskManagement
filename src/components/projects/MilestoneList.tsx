'use client'

import { useState, useMemo } from 'react'
import { useMilestones, useCreateMilestone, useUpdateMilestone, useDeleteMilestone } from '@/hooks/useMilestones'
import { ProgressBar } from '@/components/shared'
import { formatDate } from '@/lib/utils'
import type { Milestone, MilestoneStatus } from '@/types/project'

// ---------------------------------------------------------------------------
// Status config
// ---------------------------------------------------------------------------

const MILESTONE_STATUS_CONFIG: Record<MilestoneStatus, { label: string; labelEn: string; bg: string; text: string; border: string }> = {
  pending: {
    label: '未着手',
    labelEn: 'Pending',
    bg: 'bg-slate-100 dark:bg-slate-800',
    text: 'text-slate-600 dark:text-slate-300',
    border: 'border-slate-300 dark:border-slate-600',
  },
  in_progress: {
    label: '進行中',
    labelEn: 'In Progress',
    bg: 'bg-blue-100 dark:bg-blue-950/40',
    text: 'text-blue-700 dark:text-blue-400',
    border: 'border-blue-300 dark:border-blue-800',
  },
  completed: {
    label: '完了',
    labelEn: 'Completed',
    bg: 'bg-emerald-100 dark:bg-emerald-950/40',
    text: 'text-emerald-700 dark:text-emerald-400',
    border: 'border-emerald-300 dark:border-emerald-800',
  },
  overdue: {
    label: '期限超過',
    labelEn: 'Overdue',
    bg: 'bg-red-100 dark:bg-red-950/40',
    text: 'text-red-700 dark:text-red-400',
    border: 'border-red-300 dark:border-red-800',
  },
}

// ---------------------------------------------------------------------------
// MilestoneStatusBadge
// ---------------------------------------------------------------------------

function MilestoneStatusBadge({ status }: { status: MilestoneStatus }) {
  const config = MILESTONE_STATUS_CONFIG[status]
  return (
    <span
      className={`${config.bg} ${config.text} ${config.border} text-[10px] px-[8px] py-[1px] rounded-full font-semibold border whitespace-nowrap`}
    >
      {config.label}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Add/Edit Milestone Modal
// ---------------------------------------------------------------------------

function MilestoneFormModal({
  milestone,
  projectId,
  onClose,
  onSave,
  saving,
}: {
  milestone?: Milestone
  projectId: string
  onClose: () => void
  onSave: (data: { title: string; description: string; due_date: string; status: MilestoneStatus }) => void
  saving: boolean
}) {
  const [title, setTitle] = useState(milestone?.title ?? '')
  const [description, setDescription] = useState(milestone?.description ?? '')
  const [dueDate, setDueDate] = useState(milestone?.due_date ?? '')
  const [status, setStatus] = useState<MilestoneStatus>(milestone?.status ?? 'pending')

  const isEdit = !!milestone

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-surface rounded-[12px] shadow-xl border border-border2 p-[24px] w-[440px]">
        <h2 className="text-[15px] font-bold text-text mb-[16px]">
          {isEdit ? 'マイルストーン編集' : 'マイルストーン追加'}
        </h2>
        <div className="space-y-[12px]">
          <div>
            <label className="text-[11px] text-text2 font-medium block mb-[4px]">タイトル</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-[13px] text-text px-[10px] py-[7px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint"
              placeholder="マイルストーン名"
            />
          </div>
          <div>
            <label className="text-[11px] text-text2 font-medium block mb-[4px]">説明</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full text-[13px] text-text px-[10px] py-[7px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint resize-none h-[60px]"
              placeholder="説明（任意）"
            />
          </div>
          <div className="grid grid-cols-2 gap-[12px]">
            <div>
              <label className="text-[11px] text-text2 font-medium block mb-[4px]">期限日</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full text-[13px] text-text px-[10px] py-[7px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint"
              />
            </div>
            <div>
              <label className="text-[11px] text-text2 font-medium block mb-[4px]">ステータス</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as MilestoneStatus)}
                className="w-full text-[13px] text-text px-[10px] py-[7px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint"
              >
                <option value="pending">未着手</option>
                <option value="in_progress">進行中</option>
                <option value="completed">完了</option>
                <option value="overdue">期限超過</option>
              </select>
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
            onClick={() => onSave({ title, description, due_date: dueDate, status })}
            disabled={saving || !title.trim()}
            className="px-[16px] py-[7px] text-[12px] text-white bg-mint rounded-[6px] hover:bg-mint-d transition-colors disabled:opacity-50"
          >
            {saving ? '保存中...' : isEdit ? '更新' : '追加'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Delete confirmation modal
// ---------------------------------------------------------------------------

function DeleteConfirmModal({
  milestone,
  onClose,
  onConfirm,
  deleting,
}: {
  milestone: Milestone
  onClose: () => void
  onConfirm: () => void
  deleting: boolean
}) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-surface rounded-[12px] shadow-xl border border-border2 p-[24px] w-[380px]">
        <h2 className="text-[15px] font-bold text-text mb-[8px]">マイルストーン削除</h2>
        <p className="text-[12px] text-text2 mb-[20px]">
          「{milestone.title}」を削除しますか？この操作は取り消せません。
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
            disabled={deleting}
            className="px-[16px] py-[7px] text-[12px] text-white bg-danger rounded-[6px] hover:opacity-90 transition-colors disabled:opacity-50"
          >
            {deleting ? '削除中...' : '削除'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// MilestoneList (main export)
// ---------------------------------------------------------------------------

export function MilestoneList({ projectId }: { projectId: string }) {
  const { data: milestones, isLoading } = useMilestones(projectId)
  const createMutation = useCreateMilestone()
  const updateMutation = useUpdateMilestone()
  const deleteMutation = useDeleteMilestone()

  const [showAddForm, setShowAddForm] = useState(false)
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null)
  const [deletingMilestone, setDeletingMilestone] = useState<Milestone | null>(null)

  // Progress calculation
  const progress = useMemo(() => {
    if (!milestones || milestones.length === 0) return { completed: 0, total: 0, percentage: 0 }
    const completed = milestones.filter((m) => m.status === 'completed').length
    const total = milestones.length
    return { completed, total, percentage: Math.round((completed / total) * 100) }
  }, [milestones])

  const handleCreate = async (data: { title: string; description: string; due_date: string; status: MilestoneStatus }) => {
    await createMutation.mutateAsync({
      project_id: projectId,
      title: data.title,
      description: data.description || undefined,
      due_date: data.due_date || undefined,
      status: data.status,
    })
    setShowAddForm(false)
  }

  const handleUpdate = async (data: { title: string; description: string; due_date: string; status: MilestoneStatus }) => {
    if (!editingMilestone) return
    await updateMutation.mutateAsync({
      id: editingMilestone.id,
      projectId,
      data: {
        title: data.title,
        description: data.description,
        due_date: data.due_date || null,
        status: data.status,
      },
    })
    setEditingMilestone(null)
  }

  const handleDelete = async () => {
    if (!deletingMilestone) return
    await deleteMutation.mutateAsync({ id: deletingMilestone.id, projectId })
    setDeletingMilestone(null)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-[32px]">
        <span className="text-[13px] text-text3">読み込み中...</span>
      </div>
    )
  }

  return (
    <div className="space-y-[16px]">
      {/* Header with progress */}
      <div className="flex items-center justify-between">
        <h3 className="text-[13px] font-bold text-text">
          マイルストーン ({progress.completed}/{progress.total})
        </h3>
        <button
          onClick={() => setShowAddForm(true)}
          className="px-[14px] py-[6px] text-[12px] font-semibold text-white bg-mint rounded-[6px] hover:bg-mint-d transition-colors"
        >
          + マイルストーン追加
        </button>
      </div>

      {/* Progress bar */}
      {progress.total > 0 && (
        <div className="bg-surface border border-border2 rounded-[10px] shadow p-[16px]">
          <div className="flex items-center justify-between mb-[8px]">
            <span className="text-[12px] font-semibold text-text">進捗</span>
            <span className="text-[12px] text-text2">{progress.percentage}%</span>
          </div>
          <ProgressBar value={progress.percentage} height="lg" />
        </div>
      )}

      {/* Milestone list */}
      <div className="bg-surface border border-border2 rounded-[10px] shadow overflow-hidden">
        {(!milestones || milestones.length === 0) ? (
          <div className="px-[16px] py-[32px] text-center text-[13px] text-text3">
            マイルストーンがありません
          </div>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-wf-border">
                <th className="px-[12px] py-[10px] text-[11px] font-semibold text-text2">タイトル</th>
                <th className="px-[12px] py-[10px] text-[11px] font-semibold text-text2">説明</th>
                <th className="px-[12px] py-[10px] text-[11px] font-semibold text-text2">期限日</th>
                <th className="px-[12px] py-[10px] text-[11px] font-semibold text-text2">ステータス</th>
                <th className="px-[12px] py-[10px] text-[11px] font-semibold text-text2 text-center">操作</th>
              </tr>
            </thead>
            <tbody>
              {milestones.map((milestone) => (
                <tr
                  key={milestone.id}
                  className="border-b border-wf-border last:border-b-0 hover:bg-surf2/50 transition-colors"
                >
                  <td className="px-[12px] py-[10px] text-[12.5px] font-bold text-text">
                    {milestone.title}
                  </td>
                  <td className="px-[12px] py-[10px] text-[12px] text-text2 max-w-[200px] truncate">
                    {milestone.description || '-'}
                  </td>
                  <td className="px-[12px] py-[10px] text-[12px] text-text2 whitespace-nowrap">
                    {milestone.due_date ? formatDate(milestone.due_date) : '-'}
                  </td>
                  <td className="px-[12px] py-[10px]">
                    <MilestoneStatusBadge status={milestone.status} />
                  </td>
                  <td className="px-[12px] py-[10px]">
                    <div className="flex items-center justify-center gap-[8px]">
                      <button
                        onClick={() => setEditingMilestone(milestone)}
                        className="text-[11px] text-mint hover:opacity-80 font-medium transition-colors"
                      >
                        編集
                      </button>
                      <button
                        onClick={() => setDeletingMilestone(milestone)}
                        className="text-[11px] text-danger hover:opacity-80 font-medium transition-colors"
                      >
                        削除
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add modal */}
      {showAddForm && (
        <MilestoneFormModal
          projectId={projectId}
          onClose={() => setShowAddForm(false)}
          onSave={handleCreate}
          saving={createMutation.isPending}
        />
      )}

      {/* Edit modal */}
      {editingMilestone && (
        <MilestoneFormModal
          milestone={editingMilestone}
          projectId={projectId}
          onClose={() => setEditingMilestone(null)}
          onSave={handleUpdate}
          saving={updateMutation.isPending}
        />
      )}

      {/* Delete confirmation */}
      {deletingMilestone && (
        <DeleteConfirmModal
          milestone={deletingMilestone}
          onClose={() => setDeletingMilestone(null)}
          onConfirm={handleDelete}
          deleting={deleteMutation.isPending}
        />
      )}
    </div>
  )
}
