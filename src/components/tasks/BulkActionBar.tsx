'use client'

import { useState } from 'react'
import { useBulkUpdateTaskStatus, useBulkAssignTasks, useBulkDeleteTasks } from '@/hooks/useTasks'
import { useMembers } from '@/hooks/useMembers'
import { useI18n } from '@/hooks/useI18n'
import { STATUS_LABELS } from '@/lib/constants'
import type { TaskStatus } from '@/types/database'

const STATUSES: TaskStatus[] = ['waiting', 'todo', 'in_progress', 'done', 'rejected']

interface BulkActionBarProps {
  selectedIds: Set<string>
  onClearSelection: () => void
}

export function BulkActionBar({ selectedIds, onClearSelection }: BulkActionBarProps) {
  const { t } = useI18n()
  const [statusMenuOpen, setStatusMenuOpen] = useState(false)
  const [assignMenuOpen, setAssignMenuOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)

  const bulkStatus = useBulkUpdateTaskStatus()
  const bulkAssign = useBulkAssignTasks()
  const bulkDelete = useBulkDeleteTasks()
  const { data: members } = useMembers()

  const count = selectedIds.size
  if (count === 0) return null

  const isPending = bulkStatus.isPending || bulkAssign.isPending || bulkDelete.isPending

  const handleStatusChange = (status: TaskStatus) => {
    bulkStatus.mutate(
      { taskIds: Array.from(selectedIds), status },
      { onSuccess: () => { onClearSelection(); setStatusMenuOpen(false) } }
    )
  }

  const handleAssign = (userId: string) => {
    bulkAssign.mutate(
      { taskIds: Array.from(selectedIds), userId },
      { onSuccess: () => { onClearSelection(); setAssignMenuOpen(false) } }
    )
  }

  const handleDelete = () => {
    bulkDelete.mutate(
      Array.from(selectedIds),
      { onSuccess: () => { onClearSelection(); setDeleteConfirmOpen(false) } }
    )
  }

  const activeMembers = (members ?? []).filter((m) => m.is_active)

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-mint-ll border border-mint rounded-lg flex-wrap">
      <span className="text-[12.5px] font-semibold text-text">
        {t('bulk.selectedCount').replace('{count}', String(count))}
      </span>

      {/* Status change dropdown */}
      <div className="relative">
        <button
          type="button"
          onClick={() => { setStatusMenuOpen(!statusMenuOpen); setAssignMenuOpen(false) }}
          disabled={isPending}
          className="h-[30px] px-3 rounded-md text-[12px] font-semibold bg-mint text-white hover:bg-mint-d transition-colors disabled:opacity-50"
        >
          {bulkStatus.isPending ? t('bulk.updating') : t('bulk.changeStatus')}
        </button>
        {statusMenuOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setStatusMenuOpen(false)} />
            <div className="absolute top-full left-0 mt-1 bg-surface border border-wf-border rounded-lg shadow-lg z-20 py-1 min-w-[160px]">
              {STATUSES.map((s) => (
                <button
                  key={s} type="button" onClick={() => handleStatusChange(s)}
                  className="w-full text-left px-3 py-2 text-[12px] text-text hover:bg-surf2 transition-colors"
                >
                  {STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Assign dropdown */}
      <div className="relative">
        <button
          type="button"
          onClick={() => { setAssignMenuOpen(!assignMenuOpen); setStatusMenuOpen(false) }}
          disabled={isPending}
          className="h-[30px] px-3 rounded-md text-[12px] font-semibold bg-info text-white hover:opacity-90 transition-colors disabled:opacity-50"
        >
          {bulkAssign.isPending ? t('bulk.updating') : t('bulk.assign')}
        </button>
        {assignMenuOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setAssignMenuOpen(false)} />
            <div className="absolute top-full left-0 mt-1 bg-surface border border-wf-border rounded-lg shadow-lg z-20 py-1 min-w-[180px] max-h-[240px] overflow-y-auto">
              {activeMembers.map((m) => (
                <button
                  key={m.id} type="button" onClick={() => handleAssign(m.id)}
                  className="w-full text-left px-3 py-2 text-[12px] text-text hover:bg-surf2 transition-colors"
                >
                  {m.name}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Delete */}
      <div className="relative">
        {!deleteConfirmOpen ? (
          <button
            type="button" onClick={() => setDeleteConfirmOpen(true)} disabled={isPending}
            className="h-[30px] px-3 rounded-md text-[12px] font-semibold bg-danger text-white hover:opacity-90 transition-colors disabled:opacity-50"
          >
            {t('common.delete')}
          </button>
        ) : (
          <div className="flex items-center gap-2 bg-danger-bg border border-danger-b rounded-lg px-3 py-1.5">
            <span className="text-[11px] text-danger font-semibold">
              {t('bulk.deleteConfirm').replace('{count}', String(count))}
            </span>
            <button
              type="button" onClick={handleDelete} disabled={bulkDelete.isPending}
              className="h-[26px] px-2.5 rounded text-[11px] font-semibold bg-danger text-white hover:opacity-90 transition-colors disabled:opacity-50"
            >
              {bulkDelete.isPending ? t('bulk.deleting') : t('bulk.confirmDelete')}
            </button>
            <button type="button" onClick={() => setDeleteConfirmOpen(false)} className="text-[11px] text-text2 hover:text-text">
              {t('common.cancel')}
            </button>
          </div>
        )}
      </div>

      {/* Clear selection */}
      <button type="button" onClick={onClearSelection} className="text-[11px] text-text2 hover:text-text ml-auto">
        {t('bulk.clearSelection')}
      </button>
    </div>
  )
}
