'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSubtasks, useCreateTask } from '@/hooks/useTasks'
import type { TaskWithRelations } from '@/types/database'
import { Avatar, ProgressBar, StatusChip } from '@/components/shared'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface SubtaskListProps {
  parentTask: TaskWithRelations
}

// ---------------------------------------------------------------------------
// Mini form for adding a subtask
// ---------------------------------------------------------------------------

function AddSubtaskForm({
  parentTask,
  onClose,
}: {
  parentTask: TaskWithRelations
  onClose: () => void
}) {
  const [title, setTitle] = useState('')
  const createTask = useCreateTask()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    await createTask.mutateAsync({
      step1: {
        client_name: parentTask.client.name,
        title: title.trim(),
        parent_task_id: parentTask.id,
        wbs_code: '',
      },
    })
    setTitle('')
    onClose()
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-[8px] mt-[8px]">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="サブタスク名を入力..."
        autoFocus
        className="
          flex-1 rounded-lg border border-wf-border px-3 py-1.5 text-[12.5px] text-text1
          bg-surface placeholder:text-text3
          focus:outline-none focus:ring-2 focus:ring-mint/40 focus:border-mint
        "
      />
      <button
        type="submit"
        disabled={!title.trim() || createTask.isPending}
        className="
          px-3 py-1.5 rounded-lg text-[12px] font-semibold
          text-white bg-mint hover:bg-mint-d transition-colors
          disabled:opacity-50 disabled:cursor-not-allowed
        "
      >
        {createTask.isPending ? '...' : '追加'}
      </button>
      <button
        type="button"
        onClick={onClose}
        className="
          px-3 py-1.5 rounded-lg text-[12px] font-semibold
          text-text2 bg-surf2 border border-wf-border
          hover:bg-wf-border transition-colors
        "
      >
        キャンセル
      </button>
    </form>
  )
}

// ---------------------------------------------------------------------------
// SubtaskList component
// ---------------------------------------------------------------------------

export function SubtaskList({ parentTask }: SubtaskListProps) {
  const router = useRouter()
  const { data: subtasks, isLoading } = useSubtasks(parentTask.id)
  const [showForm, setShowForm] = useState(false)

  return (
    <div className="bg-surface rounded-xl border border-wf-border shadow-sm">
      {/* Header */}
      <div className="px-6 py-4 border-b border-wf-border flex items-center justify-between">
        <h2 className="text-[14px] font-bold text-text1">
          サブタスク
          {subtasks && subtasks.length > 0 && (
            <span className="ml-[6px] text-[12px] font-normal text-text3">
              ({subtasks.length})
            </span>
          )}
        </h2>
      </div>

      {/* Content */}
      <div className="px-6 py-4">
        {isLoading && (
          <div className="text-[12px] text-text3 py-[8px]">読み込み中...</div>
        )}

        {!isLoading && subtasks && subtasks.length === 0 && !showForm && (
          <div className="text-[12px] text-text3 py-[8px]">
            サブタスクはありません
          </div>
        )}

        {/* Subtask list */}
        {subtasks && subtasks.length > 0 && (
          <div className="flex flex-col gap-[2px]">
            {subtasks.map((task) => (
              <div
                key={task.id}
                onClick={() => router.push(`/tasks/${task.id}`)}
                className="
                  flex items-center gap-[12px] px-[12px] py-[8px] rounded-lg
                  cursor-pointer hover:bg-surf2/50 transition-colors
                  border border-transparent hover:border-wf-border
                "
              >
                {/* WBS code */}
                {task.wbs_code && (
                  <span className="text-[10px] font-mono text-text3 w-[36px] shrink-0">
                    {task.wbs_code}
                  </span>
                )}

                {/* Status */}
                <div className="shrink-0">
                  <StatusChip status={task.status} size="sm" />
                </div>

                {/* Title */}
                <div className="flex-1 min-w-0">
                  <span className="text-[12.5px] font-semibold text-text truncate block">
                    {task.title}
                  </span>
                </div>

                {/* Progress */}
                <div className="flex items-center gap-[6px] w-[80px] shrink-0">
                  <span className="text-[10px] font-semibold text-text2 w-[28px] text-right">
                    {task.progress}%
                  </span>
                  <div className="flex-1">
                    <ProgressBar value={task.progress} height="sm" />
                  </div>
                </div>

                {/* Assignee */}
                <div className="shrink-0">
                  {task.assigned_user ? (
                    <Avatar
                      name_short={task.assigned_user.name_short}
                      color={task.assigned_user.avatar_color}
                      size="sm"
                    />
                  ) : (
                    <span className="text-[10px] italic text-text3">-</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add subtask */}
        {showForm ? (
          <AddSubtaskForm
            parentTask={parentTask}
            onClose={() => setShowForm(false)}
          />
        ) : (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="
              mt-[8px] text-[12px] font-semibold text-mint
              hover:text-mint-d transition-colors
            "
          >
            + サブタスク追加
          </button>
        )}
      </div>
    </div>
  )
}
