'use client'

import { useState } from 'react'
import { useBulkUpdateTaskStatus } from '@/hooks/useTasks'
import { STATUS_LABELS } from '@/lib/constants'
import type { TaskStatus } from '@/types/database'

const STATUSES: TaskStatus[] = ['waiting', 'todo', 'in_progress', 'done', 'rejected']

interface BulkActionBarProps {
  selectedIds: Set<string>
  onClearSelection: () => void
}

export function BulkActionBar({ selectedIds, onClearSelection }: BulkActionBarProps) {
  const [statusMenuOpen, setStatusMenuOpen] = useState(false)
  const bulkUpdate = useBulkUpdateTaskStatus()

  const count = selectedIds.size
  if (count === 0) return null

  const handleStatusChange = (status: TaskStatus) => {
    bulkUpdate.mutate(
      { taskIds: Array.from(selectedIds), status },
      {
        onSuccess: () => {
          onClearSelection()
          setStatusMenuOpen(false)
        },
      }
    )
  }

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-mint-ll border border-mint rounded-lg">
      <span className="text-[12.5px] font-semibold text-text">
        {count}件選択中
      </span>

      {/* Status change dropdown */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setStatusMenuOpen(!statusMenuOpen)}
          disabled={bulkUpdate.isPending}
          className="
            h-[30px] px-3 rounded-md text-[12px] font-semibold
            bg-mint text-white hover:bg-mint-d transition-colors
            disabled:opacity-50
          "
        >
          {bulkUpdate.isPending ? '更新中...' : 'ステータス変更'}
        </button>

        {statusMenuOpen && (
          <>
            {/* Backdrop to close menu */}
            <div
              className="fixed inset-0 z-10"
              onClick={() => setStatusMenuOpen(false)}
            />
            <div className="absolute top-full left-0 mt-1 bg-surface border border-wf-border rounded-lg shadow-lg z-20 py-1 min-w-[160px]">
              {STATUSES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => handleStatusChange(s)}
                  className="w-full text-left px-3 py-2 text-[12px] text-text hover:bg-surf2 transition-colors"
                >
                  {STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Clear selection */}
      <button
        type="button"
        onClick={onClearSelection}
        className="text-[11px] text-text2 hover:text-text ml-auto"
      >
        選択解除
      </button>
    </div>
  )
}
