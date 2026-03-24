'use client'

import { useParams, useRouter } from 'next/navigation'
import { useTask, useUpdateTaskProgress } from '@/hooks/useTasks'
import { useAuth } from '@/hooks/useAuth'
import { StatusChip } from '@/components/shared'
import { TaskDetailInfo } from '@/components/tasks/TaskDetailInfo'
import { ProgressInput } from '@/components/tasks/ProgressInput'
import { CommentSection } from '@/components/tasks/CommentSection'
import { AssignInfo } from '@/components/tasks/AssignInfo'
import { ActivityLog } from '@/components/tasks/ActivityLog'
import { AttachmentList } from '@/components/tasks/AttachmentList'

export default function TaskDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { user } = useAuth()
  const { data: task, isLoading } = useTask(params.id)
  const updateProgress = useUpdateTaskProgress()

  const handleReject = () => {
    if (!task) return
    updateProgress.mutate({
      taskId: task.id,
      update: {
        progress: task.progress,
        status: 'rejected',
        actual_hours: task.actual_hours,
      },
    })
  }

  const handleComplete = () => {
    if (!task) return
    updateProgress.mutate({
      taskId: task.id,
      update: {
        progress: 100,
        status: 'done',
        actual_hours: task.actual_hours,
      },
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-[13px] text-text3">読み込み中...</div>
      </div>
    )
  }

  if (!task) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-[13px] text-text3">タスクが見つかりません</div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="shrink-0 flex items-center gap-3 px-6 py-3 border-b border-wf-border bg-surface">
        <button
          type="button"
          onClick={() => router.back()}
          className="text-[12px] text-text2 hover:text-mint transition-colors"
        >
          ← 一覧に戻る
        </button>

        <h1 className="text-[15px] font-bold text-text truncate max-w-[400px]">
          {task.title}
        </h1>

        <StatusChip status={task.status} />

        {/* Spacer */}
        <div className="flex-1" />

        {task.assigned_user && (
          <span className="text-[9.5px] px-[7px] py-[1px] rounded-full font-bold border inline-block bg-ok-bg text-ok border-ok-b">
            {task.assigned_user.name}
          </span>
        )}

        <button
          type="button"
          onClick={handleReject}
          disabled={updateProgress.isPending}
          className="px-3 py-1.5 rounded-md text-[12px] font-bold border border-danger-b text-danger bg-danger-bg hover:bg-danger hover:text-white transition-colors disabled:opacity-50"
        >
          差し戻し
        </button>

        <button
          type="button"
          onClick={handleComplete}
          disabled={updateProgress.isPending}
          className="px-3 py-1.5 rounded-md text-[12px] font-bold bg-mint text-white hover:bg-mint-d transition-colors disabled:opacity-50"
        >
          ✓ 完了にする
        </button>
      </div>

      {/* 2-column layout */}
      <div
        className="flex-1 overflow-y-auto p-6"
        style={{
          display: 'grid',
          gridTemplateColumns: '1.6fr 1fr',
          gap: 24,
          alignItems: 'start',
        }}
      >
        {/* Left column */}
        <div className="flex flex-col gap-4">
          <TaskDetailInfo task={task} />
          <ProgressInput task={task} />
          <CommentSection taskId={task.id} currentUserId={user.id} />
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-4">
          <AssignInfo task={task} />
          <ActivityLog taskId={task.id} />
          <AttachmentList taskId={task.id} />
        </div>
      </div>
    </div>
  )
}
