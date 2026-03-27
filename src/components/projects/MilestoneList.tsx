'use client'

import { useState, useMemo } from 'react'
import { useMilestones, useCreateMilestone, useUpdateMilestone, useDeleteMilestone } from '@/hooks/useMilestones'
import { useI18n } from '@/hooks/useI18n'
import { ProgressBar } from '@/components/shared'
import { formatDate } from '@/lib/utils'
import type { Milestone, MilestoneStatus } from '@/types/project'

// ---------------------------------------------------------------------------
// Status config (styles only — labels come from i18n)
// ---------------------------------------------------------------------------

const MILESTONE_STATUS_STYLES: Record<MilestoneStatus, { i18nKey: string; bg: string; text: string; border: string }> = {
  pending: {
    i18nKey: 'milestones.pending',
    bg: 'bg-slate-100 dark:bg-slate-800',
    text: 'text-slate-600 dark:text-slate-300',
    border: 'border-slate-300 dark:border-slate-600',
  },
  in_progress: {
    i18nKey: 'milestones.inProgress',
    bg: 'bg-blue-100 dark:bg-blue-950/40',
    text: 'text-blue-700 dark:text-blue-400',
    border: 'border-blue-300 dark:border-blue-800',
  },
  completed: {
    i18nKey: 'milestones.completed',
    bg: 'bg-emerald-100 dark:bg-emerald-950/40',
    text: 'text-emerald-700 dark:text-emerald-400',
    border: 'border-emerald-300 dark:border-emerald-800',
  },
  overdue: {
    i18nKey: 'milestones.overdue',
    bg: 'bg-red-100 dark:bg-red-950/40',
    text: 'text-red-700 dark:text-red-400',
    border: 'border-red-300 dark:border-red-800',
  },
}

// ---------------------------------------------------------------------------
// MilestoneStatusBadge
// ---------------------------------------------------------------------------

function MilestoneStatusBadge({ status, t }: { status: MilestoneStatus; t: (key: string) => string }) {
  const config = MILESTONE_STATUS_STYLES[status]
  return (
    <span
      className={`${config.bg} ${config.text} ${config.border} text-[10px] px-[8px] py-[1px] rounded-full font-semibold border whitespace-nowrap`}
    >
      {t(config.i18nKey)}
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
  t,
}: {
  milestone?: Milestone
  projectId: string
  onClose: () => void
  onSave: (data: { title: string; description: string; due_date: string; status: MilestoneStatus }) => void
  saving: boolean
  t: (key: string) => string
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
          {isEdit ? t('milestones.edit') : t('milestones.add')}
        </h2>
        <div className="space-y-[12px]">
          <div>
            <label className="text-[11px] text-text2 font-medium block mb-[4px]">{t('milestones.tableTitle')}</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-[13px] text-text px-[10px] py-[7px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint"
              placeholder={t('milestones.namePlaceholder')}
            />
          </div>
          <div>
            <label className="text-[11px] text-text2 font-medium block mb-[4px]">{t('milestones.description')}</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full text-[13px] text-text px-[10px] py-[7px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint resize-none h-[60px]"
              placeholder={t('milestones.descriptionPlaceholder')}
            />
          </div>
          <div className="grid grid-cols-2 gap-[12px]">
            <div>
              <label className="text-[11px] text-text2 font-medium block mb-[4px]">{t('milestones.dueDate')}</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full text-[13px] text-text px-[10px] py-[7px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint"
              />
            </div>
            <div>
              <label className="text-[11px] text-text2 font-medium block mb-[4px]">{t('milestones.status')}</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as MilestoneStatus)}
                className="w-full text-[13px] text-text px-[10px] py-[7px] bg-surface border border-border2 rounded-[6px] outline-none focus:border-mint"
              >
                <option value="pending">{t('milestones.pending')}</option>
                <option value="in_progress">{t('milestones.inProgress')}</option>
                <option value="completed">{t('milestones.completed')}</option>
                <option value="overdue">{t('milestones.overdue')}</option>
              </select>
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
            onClick={() => onSave({ title, description, due_date: dueDate, status })}
            disabled={saving || !title.trim()}
            className="px-[16px] py-[7px] text-[12px] text-white bg-mint rounded-[6px] hover:bg-mint-d transition-colors disabled:opacity-50"
          >
            {saving ? t('milestones.saving') : isEdit ? t('milestones.update') : t('common.add')}
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
  t,
}: {
  milestone: Milestone
  onClose: () => void
  onConfirm: () => void
  deleting: boolean
  t: (key: string) => string
}) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-surface rounded-[12px] shadow-xl border border-border2 p-[24px] w-[380px]">
        <h2 className="text-[15px] font-bold text-text mb-[8px]">{t('milestones.delete')}</h2>
        <p className="text-[12px] text-text2 mb-[20px]">
          {t('milestones.deleteConfirm').replace('{name}', milestone.title)}
        </p>
        <div className="flex justify-end gap-[8px]">
          <button
            onClick={onClose}
            className="px-[16px] py-[7px] text-[12px] text-text2 bg-surf2 rounded-[6px] hover:bg-border2 transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="px-[16px] py-[7px] text-[12px] text-white bg-danger rounded-[6px] hover:opacity-90 transition-colors disabled:opacity-50"
          >
            {deleting ? t('milestones.deleting') : t('common.delete')}
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
  const { t } = useI18n()
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
        <span className="text-[13px] text-text3">{t('common.loading')}</span>
      </div>
    )
  }

  return (
    <div className="space-y-[16px]">
      {/* Header with progress */}
      <div className="flex items-center justify-between">
        <h3 className="text-[13px] font-bold text-text">
          {t('milestones.title')} ({progress.completed}/{progress.total})
        </h3>
        <button
          onClick={() => setShowAddForm(true)}
          className="px-[14px] py-[6px] text-[12px] font-semibold text-white bg-mint rounded-[6px] hover:bg-mint-d transition-colors"
        >
          {t('milestones.add')}
        </button>
      </div>

      {/* Progress bar */}
      {progress.total > 0 && (
        <div className="bg-surface border border-border2 rounded-[10px] shadow p-[16px]">
          <div className="flex items-center justify-between mb-[8px]">
            <span className="text-[12px] font-semibold text-text">{t('milestones.progress')}</span>
            <span className="text-[12px] text-text2">{progress.percentage}%</span>
          </div>
          <ProgressBar value={progress.percentage} height="lg" />
        </div>
      )}

      {/* Milestone list */}
      <div className="bg-surface border border-border2 rounded-[10px] shadow overflow-hidden">
        {(!milestones || milestones.length === 0) ? (
          <div className="px-[16px] py-[32px] text-center text-[13px] text-text3">
            {t('milestones.noData')}
          </div>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-wf-border">
                <th className="px-[12px] py-[10px] text-[11px] font-semibold text-text2">{t('milestones.tableTitle')}</th>
                <th className="px-[12px] py-[10px] text-[11px] font-semibold text-text2">{t('milestones.description')}</th>
                <th className="px-[12px] py-[10px] text-[11px] font-semibold text-text2">{t('milestones.dueDate')}</th>
                <th className="px-[12px] py-[10px] text-[11px] font-semibold text-text2">{t('milestones.status')}</th>
                <th className="px-[12px] py-[10px] text-[11px] font-semibold text-text2 text-center">{t('milestones.actions')}</th>
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
                    <MilestoneStatusBadge status={milestone.status} t={t} />
                  </td>
                  <td className="px-[12px] py-[10px]">
                    <div className="flex items-center justify-center gap-[8px]">
                      <button
                        onClick={() => setEditingMilestone(milestone)}
                        className="text-[11px] text-mint hover:opacity-80 font-medium transition-colors"
                      >
                        {t('common.edit')}
                      </button>
                      <button
                        onClick={() => setDeletingMilestone(milestone)}
                        className="text-[11px] text-danger hover:opacity-80 font-medium transition-colors"
                      >
                        {t('common.delete')}
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
          t={t}
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
          t={t}
        />
      )}

      {/* Delete confirmation */}
      {deletingMilestone && (
        <DeleteConfirmModal
          milestone={deletingMilestone}
          onClose={() => setDeletingMilestone(null)}
          onConfirm={handleDelete}
          deleting={deleteMutation.isPending}
          t={t}
        />
      )}
    </div>
  )
}
